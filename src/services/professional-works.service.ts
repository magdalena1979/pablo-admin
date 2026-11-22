import { supabase } from "@/lib/supabase"

export type InvoiceDetails = {
  id: string
  number: string
  date: string
  amount: number | null
  currency: string | null
}

function db() {
  if (!supabase) throw new Error("Supabase no está configurado.")
  return supabase
}

export const professionalWorksService = {
  async list(farmId?: string) {
    const request = () => {
      const query = db().from("professional_works")
        .select("id,farm_id,work_date,description,invoiced,farms(client_id),professional_work_sessions(session_id),professional_invoice_works(professional_invoices(invoice_number))")
        .order("work_date", { ascending: false }).order("id")
      return farmId ? query.eq("farm_id", farmId) : query
    }
    type Rows = NonNullable<Awaited<ReturnType<typeof request>>["data"]>
    const works: Rows = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await request().range(offset, offset + 499)
      if (error) throw error
      works.push(...data)
      if (data.length < 500) return works
    }
  },

  async availableSessions(signal: AbortSignal) {
    const request = () => db().from("livestock_work_sessions")
      .select("id,farm_id,session_date,title,farms(client_id),professional_work_sessions(session_id)")
      .eq("source", "gallagher").eq("status", "confirmada")
      .order("session_date", { ascending: false }).order("id").abortSignal(signal)
    type Rows = NonNullable<Awaited<ReturnType<typeof request>>["data"]>
    const available: Rows = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await request().range(offset, offset + 499)
      if (error) throw error
      available.push(...data.filter(row => !row.professional_work_sessions ||
        (Array.isArray(row.professional_work_sessions) && !row.professional_work_sessions.length)))
      if (data.length < 500) return available
    }
  },

  async create(input: { id: string; farmId: string; date: string; description: string }) {
    const { error } = await db().rpc("create_professional_work", {
      p_id: input.id, p_farm_id: input.farmId, p_work_date: input.date,
      p_description: input.description, p_session_ids: [],
    })
    if (error) throw error
  },

  async editPending(input: { id: string; date: string; description: string }) {
    const { error } = await db().rpc("edit_pending_professional_work", {
      p_id: input.id, p_work_date: input.date, p_description: input.description,
    })
    if (error) throw error
  },

  async setInvoiced(id: string, invoiced: boolean) {
    const { error } = await db().from("professional_works").update({ invoiced })
      .eq("id", id).select("id").single()
    if (error) throw error
  },

  async recordInvoice(invoice: InvoiceDetails, clientId: string, workIds: string[], sessionIds: string[]) {
    const { error } = await db().rpc("record_professional_invoice", {
      p_id: invoice.id, p_number: invoice.number, p_date: invoice.date,
      p_amount: invoice.amount, p_currency: invoice.currency,
      p_client_id: clientId, p_work_ids: workIds, p_session_ids: sessionIds,
    })
    if (error) throw error
  },
}
