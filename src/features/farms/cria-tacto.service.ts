import type { CsvSessionType } from "@/features/livestock/csv-confirmation"
import { supabase } from "@/lib/supabase"
import { readBrucellosisBleeding, readGestation, summarizeTacto } from "./cria-tacto"

interface TactoSession {
  id: string
  title: string
  session_date: string
  session_type: string
  herds: { name: string } | { name: string }[] | null
}

function db() {
  if (!supabase) throw new Error("Supabase no está configurado.")
  return supabase
}

export async function findTactos(farmId: string, renspaId: string, signal: AbortSignal) {
  const registry = renspaId
    ? ",registry_match:ear_tag_session_links!inner(ear_tags!inner(ear_tag_ranges!inner(ear_tag_receipts!inner())))"
    : ""
  let query = db().from("livestock_work_sessions")
    .select("id,title,session_date,session_type,herds(name)" + registry)
    .eq("farm_id", farmId).eq("status", "confirmada").ilike("session_type", "tacto")
  if (renspaId) query = query.eq("registry_match.ear_tags.ear_tag_ranges.ear_tag_receipts.renspa_id", renspaId)
  query = query.order("session_date", { ascending: false }).order("id")
  const sessions: TactoSession[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query.range(offset, offset + 499).abortSignal(signal).overrideTypes<TactoSession[], { merge: false }>()
    if (error) throw error
    sessions.push(...(data ?? []))
    if ((data?.length ?? 0) < 500) return sessions
  }
}

export async function correctGallagherSessionType(farmId: string, sessionId: string, expectedType: string, type: CsvSessionType) {
  const { error } = await db().rpc("correct_gallagher_session_type", {
    p_farm_id: farmId,
    p_session_id: sessionId,
    p_expected_type: expectedType,
    p_session_type: type,
  })
  if (error?.code === "PGRST202") {
    throw new Error("Falta aplicar la migración 059 para cambiar el tipo de jornada en Supabase.")
  }
  if (error?.code === "42501" || error?.code === "P0001") throw new Error(error.message)
  if (error) throw new Error("No se pudo cambiar el tipo de jornada. Volvé a intentar.")
}

export async function loadTactoResults(farmId: string, sessionId: string, renspaId: string, signal: AbortSignal) {
  const readings: Parameters<typeof summarizeTacto>[0] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db().from("livestock_import_rows")
      .select("animal_id,raw_data,animals(tag_number,electronic_id),livestock_imports!livestock_import_rows_import_id_fkey!inner(status)")
      .eq("livestock_imports.work_session_id", sessionId).eq("livestock_imports.farm_id", farmId)
      .in("result", ["NUEVO", "EXISTENTE"]).order("id").range(offset, offset + 499).abortSignal(signal)
    if (error) throw error
    for (const row of data ?? []) {
      const origin = Array.isArray(row.livestock_imports) ? row.livestock_imports[0] : row.livestock_imports
      if (!row.animal_id || !origin || ["anulada", "revertida", "revertido"].includes(origin.status)) continue
      const raw = row.raw_data as { renspaId?: string; rawCsv?: Record<string, unknown>; tagNumber?: string } | null
      if (renspaId && raw?.renspaId !== renspaId) continue
      const animal = Array.isArray(row.animals) ? row.animals[0] : row.animals
      readings.push({
        animalId: row.animal_id, tag: raw?.tagNumber ?? animal?.tag_number ?? "",
        eid: animal?.electronic_id ?? null, gestation: readGestation(raw?.rawCsv), bleeding: readBrucellosisBleeding(raw?.rawCsv),
      })
    }
    if ((data?.length ?? 0) < 500) return summarizeTacto(readings)
  }
}
