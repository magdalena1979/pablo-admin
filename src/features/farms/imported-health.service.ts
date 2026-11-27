import { supabase } from "@/lib/supabase"
import { csvHealthMarks, type CsvHealthMark } from "./cria-tacto"

export interface ImportedHealthRecord extends CsvHealthMark {
  id: string
  importId: string
  date: string
  filename: string
  tag: string
}

export type ImportedHealthSource = Pick<ImportedHealthRecord, "date" | "filename" | "importId">

export interface ImportedHealthPage {
  rows: ImportedHealthRecord[]
  sources: ImportedHealthSource[]
  total: number
}

export const importedHealthPageSize = 20

export async function loadImportedHealthPage(
  farmId: string, renspaId: string, type: CsvHealthMark["type"], source: ImportedHealthSource | undefined,
  page: number, signal: AbortSignal,
): Promise<ImportedHealthPage | null> {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const { data, error } = await supabase.rpc("list_gallagher_health_page", {
    p_farm_id: farmId, p_renspa_id: renspaId || null, p_type: type,
    p_import_id: source?.importId ?? null, p_date: source?.date ?? null,
    p_offset: (page - 1) * importedHealthPageSize,
  }).abortSignal(signal)
  if (error?.code === "PGRST202") return null
  if (error) throw error
  return data as ImportedHealthPage
}

export async function loadImportedHealth(farmId: string, renspaId: string, signal: AbortSignal) {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const imports = new Map<string, string>()
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("livestock_imports")
      .select("id,filename,detected_headers").eq("farm_id", farmId).eq("provider", "gallagher")
      .not("status", "in", "(anulada,revertida,revertido)")
      .order("id").range(offset, offset + 499).abortSignal(signal)
    if (error) throw error
    for (const row of data ?? []) {
      const headers = row.detected_headers
      if (!Array.isArray(headers) || !headers.length || headers.some(header =>
        typeof header === "string" && csvHealthMarks({ [header]: "Yes" }).length > 0
      )) imports.set(row.id, row.filename)
    }
    if ((data?.length ?? 0) < 500) break
  }

  const records: ImportedHealthRecord[] = []
  const ids = [...imports.keys()]
  for (let batch = 0; batch < ids.length; batch += 30) {
    const importIds = ids.slice(batch, batch + 30)
    for (let offset = 0; ; offset += 1000) {
      let query = supabase.from("livestock_import_rows")
        .select("id,import_id,event_date,tag_number,raw_data")
        .in("import_id", importIds).in("result", ["NUEVO", "EXISTENTE"]).not("animal_id", "is", null)
      if (renspaId) query = query.eq("raw_data->>renspaId", renspaId)
      const { data, error } = await query.order("id").range(offset, offset + 999).abortSignal(signal)
      if (error) throw error
      for (const row of data ?? []) {
        const raw = row.raw_data as { rawCsv?: Record<string, unknown>; sourceDate?: string; tagNumber?: string } | null
        for (const mark of csvHealthMarks(raw?.rawCsv)) {
          records.push({ ...mark, id: row.id + ":" + mark.type, importId: row.import_id,
            date: (raw?.sourceDate || row.event_date || "").slice(0, 10),
            filename: imports.get(row.import_id) ?? "", tag: raw?.tagNumber || row.tag_number || "" })
        }
      }
      if ((data?.length ?? 0) < 1000) break
    }
  }
  return records.sort((a, b) => b.date.localeCompare(a.date) || a.tag.localeCompare(b.tag, "es", { numeric: true }))
}

export async function loadAtosaIdentification(importId: string, date: string, signal: AbortSignal) {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const { data, error } = await supabase.from("gallagher_atosa_identifications")
    .select("description").eq("import_id", importId).eq("work_date", date).abortSignal(signal).maybeSingle()
  if (error?.code === "PGRST205" || error?.code === "42P01") {
    throw new Error("Falta aplicar la migración 061 para guardar identificaciones de ATOSA.")
  }
  if (error) throw error
  return data?.description ?? ""
}

export async function saveAtosaIdentification(importId: string, date: string, description: string) {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const { error } = await supabase.rpc("confirm_gallagher_atosa_identification", {
    p_import_id: importId, p_work_date: date, p_description: description,
  })
  if (error?.code === "PGRST202") throw new Error("Falta aplicar la migración 061 para guardar identificaciones de ATOSA.")
  if (error) throw new Error(error.message)
}
