import { supabase } from "@/lib/supabase"
import { csvConfirmationPayload } from "@/features/livestock/csv-confirmation"
import type { CsvFileReview } from "./gallagher-csv-preview.service"

export interface CsvConfirmationResult {
  confirmation_id: string; already_imported: boolean; readings: number; animals: number
  created: number; existing: number; tags_used: number
  sessions: Array<{ session_id: string; import_id: string; farm_id: string; renspa_id: string; date: string }>
}
export async function findConfirmedCsvs(hashes: string[]): Promise<Record<string,CsvConfirmationResult>> {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const unique=[...new Set(hashes.filter(hash=>/^[a-f0-9]{64}$/.test(hash)))], found:Record<string,CsvConfirmationResult>={}
  for(let index=0;index<unique.length;index+=200){
    const {data,error}=await supabase.from("gallagher_csv_confirmations").select("file_hash,summary").in("file_hash",unique.slice(index,index+200))
    if(error){if(error.code==="42P01"||error.code==="PGRST205")return {};throw error}
    for(const row of data??[]){
      const result=row.summary as CsvConfirmationResult
      if(result?.confirmation_id&&Array.isArray(result.sessions))found[row.file_hash]={...result,already_imported:true}
    }
  }
  return found
}
export async function confirmGallagherCsv(review: CsvFileReview): Promise<CsvConfirmationResult> {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const { data, error } = await supabase.rpc("confirm_gallagher_csv_links", csvConfirmationPayload(review))
  if (error) {
    if (error.code === "PGRST202") throw new Error("Falta aplicar la migración 047 para habilitar la confirmación de vínculos.")
    if (error.code === "42883") throw new Error("Falta una función de importación requerida. Revisá que estén aplicadas las migraciones de Gallagher anteriores a la 047.")
    if (error.code === "42501") throw new Error("No tenés permiso para confirmar la vinculación.")
    throw error
  }
  if (!data?.confirmation_id || !Array.isArray(data.sessions)) throw new Error("No se pudo verificar la respuesta del servidor. Volvé a revisar el archivo antes de continuar; si se guardó, no se duplicará.")
  return data as CsvConfirmationResult
}
