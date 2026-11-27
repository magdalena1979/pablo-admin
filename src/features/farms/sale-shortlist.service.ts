import { supabase } from "@/lib/supabase"

function db() {
  if (!supabase) throw new Error("Supabase no está configurado.")
  return supabase
}

function check(error: { code: string; message: string } | null) {
  if (!error) return
  if (error.code === "PGRST205" || error.code === "42P01") {
    throw new Error("Falta aplicar la migración 060 para usar la lista de venta.")
  }
  if (error.code === "42501") throw new Error("No tenés permiso para modificar la lista de este establecimiento.")
  throw new Error(error.message)
}

export interface SaleCandidate {
  animalId: string
  tag: string
  eid: string | null
  selectedAt: string
}

export const saleShortlist = {
  async list(farmId: string, signal: AbortSignal): Promise<SaleCandidate[]> {
    const candidates: SaleCandidate[] = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db().from("livestock_sale_shortlist")
        .select("animal_id,added_at,animals!inner(tag_number,electronic_id)")
        .eq("farm_id", farmId).eq("animals.farm_id", farmId)
        .eq("animals.active", true).is("animals.reverted_at", null)
        .order("added_at", { ascending: false }).order("animal_id")
        .range(offset, offset + 499).abortSignal(signal)
      check(error)
      for (const row of data ?? []) {
        const animal = Array.isArray(row.animals) ? row.animals[0] : row.animals
        if (animal) candidates.push({ animalId: row.animal_id, tag: animal.tag_number, eid: animal.electronic_id, selectedAt: row.added_at })
      }
      if ((data?.length ?? 0) < 500) return candidates
    }
  },

  async add(farmId: string, sessionId: string, animalIds: string[]) {
    const { error } = await db().from("livestock_sale_shortlist").upsert(animalIds.map(animalId => ({
      farm_id: farmId, animal_id: animalId, source_session_id: sessionId,
    })), { onConflict: "farm_id,animal_id", ignoreDuplicates: true })
    check(error)
  },

  async remove(farmId: string, animalId: string) {
    const { data, error } = await db().from("livestock_sale_shortlist").delete()
      .eq("farm_id", farmId).eq("animal_id", animalId).select("animal_id")
    check(error)
    if (!data?.length) throw new Error("No se pudo quitar el animal. Actualizá la lista y revisá tus permisos.")
  },
}
