import { supabase } from "@/lib/supabase"
import type { HistoryEntry } from "@/features/livestock/animal-history"
function one<T>(value:T | T[] | null | undefined):T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined }
export async function loadAnimalHistory(animalId:string):Promise<HistoryEntry[]> {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const entries:HistoryEntry[]=[]
  const imported=new Set<string>()
  for(let offset=0;;offset+=1000){
    const {data,error}=await supabase.from("livestock_import_rows").select("id,event_date,notes,raw_data,import_id,livestock_imports!livestock_import_rows_import_id_fkey!inner(filename,provider,status,livestock_work_sessions!livestock_imports_work_session_id_fkey(title))").eq("animal_id",animalId).in("result",["NUEVO","EXISTENTE"]).order("id").range(offset,offset+999)
    if(error)throw error
    for(const row of data??[]){
      const origin=one(row.livestock_imports)
      if(!origin || ["anulada","revertida","revertido"].includes(origin.status))continue
      const raw=row.raw_data as Record<string,unknown> | null
      if(!row.event_date)continue
      imported.add(`${row.import_id}:${row.event_date}`)
      entries.push({id:`row:${row.id}`,date:row.event_date,title:"Lectura registrada",source:origin.provider,filename:origin.filename,sessionTitle:one(origin.livestock_work_sessions)?.title,notes:row.notes??"",fields:raw?.rawCsv && typeof raw.rawCsv==="object" ? raw.rawCsv as Record<string,unknown> : {}})
    }
    if((data?.length??0)<1000)break
  }
  for(let offset=0;;offset+=1000){
    const {data,error}=await supabase.from("animal_events").select("id,event_date,event_type,source,notes,metadata,import_id,livestock_imports!animal_events_import_id_fkey(filename,status)").eq("animal_id",animalId).is("voided_at",null).order("id").range(offset,offset+999)
    if(error)throw error
    for(const row of data??[]){
      const origin=one(row.livestock_imports)
      if(origin && ["anulada","revertida","revertido"].includes(origin.status))continue
      if(row.event_type==="lectura" && imported.has(`${row.import_id}:${row.event_date}`))continue
      const meta=(row.metadata??{}) as Record<string,unknown>
      entries.push({id:row.id,date:row.event_date,title:row.event_type.replaceAll("_"," "),source:row.source,filename:origin?.filename??String(meta.filename??""),notes:row.notes??"",fields:Object.fromEntries(Object.entries(meta).filter(([key,value])=> !["filename","rawCsv"].includes(key) && typeof value!=="object"))})
    }
    if((data?.length??0)<1000)break
  }
  return entries.sort((a,b)=>b.date.localeCompare(a.date))
}
