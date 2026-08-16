import { supabase } from "@/lib/supabase"
import type { ServiceMode } from "@/types/domain"

export interface FarmListItem { id: string; name: string; clientName: string; serviceMode: ServiceMode; locality: string; color: string; totalHectares: number; lotCount: number; herdCount: number; animalCount: number }
export interface LivestockOverview {
  totalAnimals: number; totalHerds: number; totalFarms: number
  movements: Array<{ id: string; farmName: string; operation: string; occurredOn: string; animalCount: number; totalWeightKg: number | null; notes: string | null }>
  herds: Array<{ id: string; name: string; farmName: string; lotName: string; categoryName: string; trackedAnimals: number }>
}
export interface FarmDetail extends FarmListItem { lots: Array<{ id: string; name: string; hectares: number; currentUse: string }> }
function client() { if (!supabase) throw new Error("Supabase no está configurado."); return supabase }

export const agroService = {
  async createFarm(input: { clientName: string; contactName: string; farmName: string; serviceMode: ServiceMode; locality: string; color?: string; lots: Array<{ name: string; hectares: number; currentUse: string }> }) {
    const { data, error } = await client().rpc("create_farm_with_lots", { p_client_name: input.clientName, p_contact_name: input.contactName, p_farm_name: input.farmName, p_service_mode: input.serviceMode, p_locality: input.locality, p_color: input.color ?? "#2D6AA3", p_lots: input.lots.map(lot => ({ name: lot.name, hectares: lot.hectares, current_use: lot.currentUse })) })
    if (error) throw error
    return data as string
  },
  async getFarm(id: string): Promise<FarmDetail> {
    const { data, error } = await client().from("farms").select("id,name,service_mode,locality,color,clients(legal_name),lots(id,name,hectares,current_use),herds(id),animals(id)").eq("id", id).single()
    if (error) throw error
    const owner = Array.isArray(data.clients) ? data.clients[0] : data.clients
    return { id: data.id, name: data.name, clientName: owner?.legal_name ?? "Sin cliente", serviceMode: data.service_mode as ServiceMode, locality: data.locality ?? "Buenos Aires", color: data.color, totalHectares: (data.lots ?? []).reduce((sum, lot) => sum + Number(lot.hectares), 0), lotCount: data.lots?.length ?? 0, herdCount: data.herds?.length ?? 0, animalCount: data.animals?.length ?? 0, lots: (data.lots ?? []).map(lot => ({ id: lot.id, name: lot.name, hectares: Number(lot.hectares), currentUse: lot.current_use ?? "Sin uso definido" })) }
  },
  async createLivestockMovement(input: { farmId: string; operation: string; occurredOn: string; animalCount: number; totalWeightKg?: number; notes?: string }) {
    const session = await client().auth.getUser()
    if (!session.data.user) throw new Error("La sesión no es válida.")
    const campaign = await client().from("campaigns").select("id").eq("farm_id", input.farmId).eq("active", true).maybeSingle()
    if (campaign.error) throw campaign.error
    const { error } = await client().from("livestock_movements").insert({ farm_id: input.farmId, campaign_id: campaign.data?.id ?? null, operation: input.operation, occurred_on: input.occurredOn, animal_count: input.animalCount, total_weight_kg: input.totalWeightKg || null, notes: input.notes?.trim() || null, status: "borrador", created_by: session.data.user.id })
    if (error) throw error
  },
  async listFarms(): Promise<FarmListItem[]> {
    const { data, error } = await client().from("farms").select("id,name,service_mode,locality,color,clients(legal_name),lots(id,hectares),herds(id),animals(id)").eq("active", true).order("name")
    if (error) throw error
    return (data ?? []).map(row => {
      const owner = Array.isArray(row.clients) ? row.clients[0] : row.clients
      return { id: row.id, name: row.name, clientName: owner?.legal_name ?? "Sin cliente", serviceMode: row.service_mode as ServiceMode, locality: row.locality ?? "Buenos Aires", color: row.color, totalHectares: (row.lots ?? []).reduce((sum, lot) => sum + Number(lot.hectares || 0), 0), lotCount: row.lots?.length ?? 0, herdCount: row.herds?.length ?? 0, animalCount: row.animals?.length ?? 0 }
    })
  },
  async getLivestockOverview(farmId?: string | null): Promise<LivestockOverview> {
    let animalsQuery = client().from("animals").select("id,farm_id", { count: "exact" }).eq("active", true)
    let herdsQuery = client().from("herds").select("id,name,farm_id,lots(name),livestock_categories(name),animals(id)").eq("active", true).order("name")
    let movementsQuery = client().from("livestock_movements").select("id,farm_id,operation,occurred_on,animal_count,total_weight_kg,notes").order("occurred_on", { ascending: false }).limit(20)
    if (farmId) { animalsQuery = animalsQuery.eq("farm_id", farmId); herdsQuery = herdsQuery.eq("farm_id", farmId); movementsQuery = movementsQuery.eq("farm_id", farmId) }
    const [animalsResult, herdsResult, movementsResult] = await Promise.all([animalsQuery, herdsQuery, movementsQuery])
    if (animalsResult.error) throw animalsResult.error
    if (herdsResult.error) throw herdsResult.error
    if (movementsResult.error) throw movementsResult.error
    const farmIds = [...new Set([...(herdsResult.data ?? []).map(row => row.farm_id), ...(movementsResult.data ?? []).map(row => row.farm_id)])]
    const farmsResult = farmIds.length ? await client().from("farms").select("id,name").in("id", farmIds) : { data: [], error: null }
    if (farmsResult.error) throw farmsResult.error
    const names = new Map((farmsResult.data ?? []).map(farm => [farm.id, farm.name]))
    const herdRows = herdsResult.data ?? []
    return {
      totalAnimals: animalsResult.count ?? 0, totalHerds: herdRows.length, totalFarms: new Set(herdRows.map(row => row.farm_id)).size,
      herds: herdRows.map(row => { const lot = Array.isArray(row.lots) ? row.lots[0] : row.lots; const category = Array.isArray(row.livestock_categories) ? row.livestock_categories[0] : row.livestock_categories; return { id: row.id, name: row.name, farmName: names.get(row.farm_id) ?? "—", lotName: lot?.name ?? "Sin lote", categoryName: category?.name ?? "Sin categoría", trackedAnimals: row.animals?.length ?? 0 } }),
      movements: (movementsResult.data ?? []).map(row => ({ id: row.id, farmName: names.get(row.farm_id) ?? "—", operation: row.operation, occurredOn: row.occurred_on, animalCount: row.animal_count, totalWeightKg: row.total_weight_kg == null ? null : Number(row.total_weight_kg), notes: row.notes })),
    }
  },
}
