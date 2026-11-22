import { supabase } from "@/lib/supabase"
import { validateTagBag, type TagRangeInput, type CheckedTagRange } from "@/features/ear-tags/ear-tag-ranges"

export interface BagInput {
  id: string; renspaId: string; receivedOn: string; first: string; last: string
  declaredQuantity: string; ranges: TagRangeInput[]
}
export interface TagReceipt {
  id: string; renspaId: string; receivedOn: string; first: string; last: string
  gallagherGroupId?: string
  quantity: number; available: number; used: number; ranges: Array<CheckedTagRange & { available: number; used: number }>
}
function db() { if (!supabase) throw new Error("Supabase no está configurado."); return supabase }
export const earTagsService = {
  async list(): Promise<TagReceipt[]> {
    const columns = "id,renspa_id,received_on,first_eid,last_eid,quantity,ear_tag_ranges(id,first_eid,last_eid,target_sex,quantity)"
    const columnsWithOrigin = `${columns},gallagher_group_id:gallagher_origin->>group_id` as const
    const page = (offset: number, withOrigin: boolean) => {
      const table = db().from("ear_tag_receipts")
      const query = withOrigin ? table.select(columnsWithOrigin) : table.select(columns)
      return query.order("received_on", { ascending: false }).order("created_at", { ascending: false }).order("id")
        .range(offset, offset + 499)
    }
    let withOrigin = true
    let result = await page(0, withOrigin)
    if (result.error?.code === "42703" && result.error.message.includes("gallagher_origin")) {
      withOrigin = false
      result = await page(0, withOrigin)
    }
    if (result.error) throw result.error
    const data = [...(result.data ?? [])]
    for (let offset = 500; data.length === offset; offset += 500) {
      const next = await page(offset, withOrigin)
      if (next.error) throw next.error
      data.push(...(next.data ?? []))
    }
    const counts = await db().from("ear_tag_stock_by_range").select("range_id,available,used")
    // Before 047, the schema only allowed available tags. Keep reception usable
    // while the new confirmation migration is waiting to be applied.
    const oldSchema = counts.error?.code === "42P01" || counts.error?.code === "PGRST205"
    if (counts.error && !oldSchema) throw counts.error
    const byRange = new Map((counts.data ?? []).map(row => [row.range_id, row]))
    const getCounts = (id: string, quantity: number) => ({ available: oldSchema ? quantity : Number(byRange.get(id)?.available ?? 0), used: Number(byRange.get(id)?.used ?? 0) })
    return data.map(row => ({ id: row.id, renspaId: row.renspa_id, receivedOn: row.received_on,
      gallagherGroupId: "gallagher_group_id" in row && typeof row.gallagher_group_id === "string" ? row.gallagher_group_id : undefined,
      first: row.first_eid, last: row.last_eid, quantity: row.quantity,
      available: (row.ear_tag_ranges ?? []).reduce((total, range) => total + getCounts(range.id, range.quantity).available, 0),
      used: (row.ear_tag_ranges ?? []).reduce((total, range) => total + getCounts(range.id, range.quantity).used, 0),
      ranges: (row.ear_tag_ranges ?? []).map(range => ({ first: range.first_eid, last: range.last_eid, sex: range.target_sex as CheckedTagRange["sex"], quantity: range.quantity, ...getCounts(range.id, range.quantity) })).sort((a, b) => a.first.localeCompare(b.first))
    }))
  },
  async receive(input: BagInput): Promise<string> {
    const checked = validateTagBag(input.first, input.last, input.declaredQuantity, input.ranges)
    if (!input.renspaId || !input.receivedOn) throw new Error("Seleccioná el RENSPA y la fecha de recepción.")
    const { data, error } = await db().rpc("receive_ear_tag_bag", {
      p_receipt_id: input.id, p_renspa_id: input.renspaId, p_received_on: input.receivedOn,
      p_first_eid: checked.first, p_last_eid: checked.last, p_declared_quantity: checked.quantity,
      p_ranges: checked.ranges.map(({ first, last, sex }) => ({ first, last, sex }))
    })
    if (error) throw error
    return data as string
  },
  async registerGallagher(input: {
    groupId: string; renspaId: string; sex: CheckedTagRange["sex"]; eids: string[]
    fileHash: string; filename: string
  }) {
    const { error } = await db().rpc("register_gallagher_tags", {
      p_group_id: input.groupId, p_renspa_id: input.renspaId, p_sex: input.sex,
      p_eids: input.eids, p_file_hash: input.fileHash, p_filename: input.filename,
    })
    if (error) throw error
  },
}
