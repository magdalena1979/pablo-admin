import { supabase } from "@/lib/supabase"

export const healthActionTypes = {
  vacunacion: "Vacunación", desparasitacion: "Desparasitación", sangrado: "Sangrado",
  tratamiento: "Tratamiento", raspaje_toros: "Raspaje de toros", control_clinico: "Control clínico",
  otro: "Otro trabajo sanitario",
} as const

export type HealthActionType = keyof typeof healthActionTypes
export interface HealthPlanItem {
  id: string
  animal_group: string
  name: string
  action_type: HealthActionType
}

export interface AssignedHealthPlanItem extends HealthPlanItem {
  farm_id: string
}

export interface ScheduledHealthPlanItem extends HealthPlanItem {
  planned_months: number[]
  reference_product: string | null
  reference_dose: string | null
  reference_schedule: string | null
}

export interface GeneralHealthPlanItem extends ScheduledHealthPlanItem {
  health_plan_item_farms: Array<{ farm_id: string; active: boolean }>
}

export interface HealthPlanDraft {
  id: string | null
  name: string
  animalGroup: string
  type: HealthActionType
  months: number[]
}

export interface HealthPlanUse {
  id: string
  date: string
  filename: string
  name: string
  group: string
}

export interface HealthPlanCompletion {
  id: string
  itemId: string
  date: string
  filename: string
}

function db() {
  if (!supabase) throw new Error("Supabase no está configurado.")
  return supabase
}

function check(error: { code: string; message: string } | null) {
  if (["PGRST200", "PGRST202", "PGRST204", "PGRST205", "42P01", "42703"].includes(error?.code ?? "")) {
    throw new Error("Falta aplicar la migración 065 del plan sanitario general.")
  }
  if (error?.code === "23505") throw new Error("Ya hay un trabajo con ese nombre para este grupo.")
  if (error) throw new Error(error.message)
}

export async function listHealthPlanItems(farmIds: string[], signal: AbortSignal): Promise<AssignedHealthPlanItem[]> {
  if (!farmIds.length) return []
  const { data, error } = await db().from("health_plan_item_farms")
    .select("farm_id,farm_health_plan_items!inner(id,animal_group,name,action_type)")
    .in("farm_id", farmIds).eq("active", true).is("farm_health_plan_items.archived_at", null)
    .abortSignal(signal).returns<Array<{ farm_id: string; farm_health_plan_items: HealthPlanItem }>>()
  check(error)
  return (data ?? []).map(row => ({ farm_id: row.farm_id, ...row.farm_health_plan_items }))
    .sort((a, b) => a.animal_group.localeCompare(b.animal_group, "es") || a.name.localeCompare(b.name, "es"))
}

export async function listFarmHealthPlanCalendar(farmId: string, signal: AbortSignal): Promise<ScheduledHealthPlanItem[]> {
  const { data, error } = await db().from("health_plan_item_farms")
    .select("farm_health_plan_items!inner(id,animal_group,name,action_type,planned_months,reference_product,reference_dose,reference_schedule)")
    .eq("farm_id", farmId).eq("active", true).is("farm_health_plan_items.archived_at", null)
    .abortSignal(signal).returns<Array<{ farm_health_plan_items: ScheduledHealthPlanItem }>>()
  if (error?.code === "42703" || error?.code === "PGRST204") throw new Error("Revisá que estén aplicadas las migraciones 067 y 069 del plan sanitario.")
  check(error)
  return (data ?? []).map(row => row.farm_health_plan_items).sort((a, b) => a.name.localeCompare(b.name, "es"))
}

export async function listGeneralHealthPlan(signal: AbortSignal): Promise<GeneralHealthPlanItem[]> {
  const { data, error } = await db().from("farm_health_plan_items")
    .select("id,name,animal_group,action_type,planned_months,reference_product,reference_dose,reference_schedule,health_plan_item_farms(farm_id,active)")
    .is("archived_at", null)
    .order("animal_group").order("name").abortSignal(signal).returns<GeneralHealthPlanItem[]>()
  if (error?.code === "42703" || error?.code === "PGRST204") throw new Error("Revisá que estén aplicadas las migraciones 067 y 069 del plan sanitario.")
  check(error)
  return data ?? []
}

export async function saveHealthPlanItem(draft: HealthPlanDraft) {
  const { error } = await db().rpc("save_general_health_plan_item", {
    p_id: draft.id, p_name: draft.name, p_animal_group: draft.animalGroup, p_type: draft.type,
    p_months: draft.months,
  })
  if (error?.code === "PGRST202") throw new Error("Falta aplicar la migración 068 para guardar trabajos con asignación automática.")
  check(error)
}

export async function listRecentHealthPlanUses(farmId: string, signal: AbortSignal): Promise<HealthPlanUse[]> {
  const { data, error } = await db().from("livestock_work_sessions")
    .select("session_date,livestock_imports!livestock_work_sessions_created_from_import_id_fkey!inner(filename),livestock_work_session_actions!inner(id,metadata,farm_health_plan_items!inner(name,animal_group))")
    .eq("farm_id", farmId).eq("status", "confirmada").order("session_date", { ascending: false })
    .order("id").limit(20).abortSignal(signal)
  check(error)
  const sessions = (data ?? []) as unknown as Array<{
    session_date: string
    livestock_imports: { filename: string }
    livestock_work_session_actions: Array<{
      id: string; metadata: { plan_item_name?: string; plan_animal_group?: string }; farm_health_plan_items: { name: string; animal_group: string }
    }>
  }>
  return sessions.flatMap(session => session.livestock_work_session_actions.map(action => ({
    id: action.id, date: session.session_date, filename: session.livestock_imports.filename,
    name: action.metadata.plan_item_name ?? action.farm_health_plan_items.name,
    group: action.metadata.plan_animal_group ?? action.farm_health_plan_items.animal_group,
  })))
}

export async function listFarmHealthPlanCompletions(farmId: string, year: number, signal: AbortSignal): Promise<HealthPlanCompletion[]> {
  type Session = {
    session_date: string
    livestock_work_session_actions: Array<{
      id: string
      health_plan_item_id: string
      source_import: { filename: string }
    }>
  }
  const results: HealthPlanCompletion[] = []
  const pageSize = 200
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db().from("livestock_work_sessions").select(
      "session_date,livestock_work_session_actions!inner(id,health_plan_item_id,source_import:livestock_imports!livestock_work_session_actions_created_from_import_id_fkey!inner(filename))",
    ).eq("farm_id", farmId).eq("status", "confirmada")
      .gte("session_date", `${year}-01-01T00:00:00Z`).lt("session_date", `${year + 1}-01-01T00:00:00Z`)
      .not("livestock_work_session_actions.health_plan_item_id", "is", null)
      .not("livestock_work_session_actions.source_import.status", "in", '("anulada","revertida","revertido")')
      .order("session_date", { ascending: false }).order("id")
      .range(offset, offset + pageSize - 1).abortSignal(signal).returns<Session[]>()
    check(error)
    const sessions = data ?? []
    for (const session of sessions) {
      results.push(...session.livestock_work_session_actions.map(action => ({
        id: action.id, itemId: action.health_plan_item_id, date: session.session_date, filename: action.source_import.filename,
      })))
    }
    if (sessions.length < pageSize) return results
  }
}
