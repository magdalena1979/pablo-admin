import { supabase } from "@/lib/supabase"
import { emptyLivestockProfile, type LivestockProfile } from "@/features/farms/livestock-profile"
import type { ServiceMode } from "@/types/domain"

export interface ClientInput { legalName: string; taxId: string; address: string; responsible: string; phone: string; email: string; color?: string }
export interface FarmInput { name: string; address: string; locality: string; province: string; serviceMode: ServiceMode | ""; livestockProfile?: LivestockProfile }
export interface RenspaInput { number: string; cuig: string; cv: string }
export interface ClientRenspa extends RenspaInput { id: string }
export interface ClientFarm extends FarmInput { id: string; livestockProfile: LivestockProfile; renspas: ClientRenspa[] }
export interface ClientRecord extends ClientInput { id: string; farms: ClientFarm[] }
function db() { if (!supabase) throw new Error("Supabase no está configurado."); return supabase }
const optional = (value: string) => value.trim() || null
function clientValues(input: ClientInput) {
  if (!input.legalName.trim()) throw new Error("Completá la razón social.")
  if (input.color && !/^#[0-9a-f]{6}$/i.test(input.color)) throw new Error("Elegí un color válido.")
  return { ...(input.color ? { color: input.color } : {}), legal_name: input.legalName.trim(), tax_id: optional(input.taxId), address: optional(input.address), contact_name: optional(input.responsible), phone: optional(input.phone), email: optional(input.email) }
}
function livestockValues(profile: LivestockProfile) {
  return { livestock_activities: profile.activities, primary_livestock_activity: profile.primary }
}
export const clientsService = {
  async list(farmId?: string): Promise<ClientRecord[]> {
    const farmFields = "id,name,address,locality,province,service_mode,active,livestock_activities,primary_livestock_activity,farm_renspas(id,number,cuig,cv)"
    const clientFields = "id,legal_name,tax_id,address,contact_name,phone,email,color"
    const relationship = farmId ? "farms!inner" : "farms"
    let query = db().from("clients").select(`${clientFields},${relationship}(${farmFields})`)
      .eq("active", true).order("legal_name")
    if (farmId) query = query.eq("farms.id", farmId).eq("farms.active", true)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(client => ({
      color: client.color ?? "#2D6AA3", id: client.id, legalName: client.legal_name, taxId: client.tax_id ?? "", address: client.address ?? "", responsible: client.contact_name ?? "", phone: client.phone ?? "", email: client.email ?? "",
      farms: (client.farms ?? []).filter(farm => farm.active).map(farm => ({ id: farm.id, name: farm.name, address: farm.address ?? "", locality: farm.locality ?? "", province: farm.province ?? "", serviceMode: farm.service_mode as ServiceMode,
        livestockProfile: { activities: farm.livestock_activities, primary: farm.primary_livestock_activity },
        renspas: (farm.farm_renspas ?? []).map(row => ({ id: row.id, number: row.number, cuig: row.cuig ?? "", cv: row.cv ?? "" })).sort((a, b) => a.number.localeCompare(b.number))
      })).sort((a, b) => a.name.localeCompare(b.name))
    }))
  },
  async saveClient(input: ClientInput, id?: string): Promise<string> {
    const values = clientValues(input)
    const query = id ? db().from("clients").update(values).eq("id", id) : db().from("clients").insert(values)
    const { data, error } = await query.select("id").single()
    if (error) throw error
    return data.id
  },
  async addFarm(clientId: string, input: FarmInput) {
    if (!input.name.trim()) throw new Error("Completá el nombre del establecimiento.")
    if (!input.serviceMode) throw new Error("Seleccioná la modalidad de servicio.")
    const { data, error } = await db().from("farms").insert({ client_id: clientId, name: input.name.trim(), address: optional(input.address), locality: optional(input.locality), province: input.province.trim(), service_mode: input.serviceMode, ...livestockValues(input.livestockProfile ?? emptyLivestockProfile) }).select("id").single()
    if (error) throw error
    return data.id
  },
  async updateLivestockProfile(farmId: string, profile: LivestockProfile) {
    const { error } = await db().from("farms").update(livestockValues(profile)).eq("id", farmId).select("id").single()
    if (error) throw error
  },
  async addRenspa(farmId: string, input: RenspaInput) {
    if (!input.number.trim()) throw new Error("Completá el RENSPA.")
    const { data, error } = await db().from("farm_renspas").insert({ farm_id: farmId, number: input.number.trim(), cuig: optional(input.cuig), cv: optional(input.cv) }).select("id").single()
    if (error) {
      if (error.code === "23505") throw new Error("Este RENSPA ya está registrado en el establecimiento.")
      throw error
    }
    return data.id
  },
}
