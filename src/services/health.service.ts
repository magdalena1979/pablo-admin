import { supabase } from "@/lib/supabase"
export interface HealthEvent { id:string; farmId:string; farmName:string; title:string; type:string; scheduledOn:string; performedOn:string|null; status:string; animalCount:number|null; product:string|null; dose:string|null; notes:string|null }
export interface ReproductiveEvent { id:string; farmId:string; farmName:string; type:string; eventDate:string; animalCount:number|null; result:string|null; notes:string|null }
function client(){if(!supabase)throw new Error("Supabase no está configurado.");return supabase}
export const healthService={
 async list(farmId?:string|null){
  let healthQuery=client().from("health_events").select("id,farm_id,title,event_type,scheduled_on,performed_on,status,animal_count,product,dose,notes,farms(name)").order("scheduled_on")
  let reproductionQuery=client().from("reproductive_events").select("id,farm_id,event_type,event_date,animal_count,result,notes,farms(name)").order("event_date",{ascending:false})
  if(farmId){healthQuery=healthQuery.eq("farm_id",farmId);reproductionQuery=reproductionQuery.eq("farm_id",farmId)}
  const [h,r]=await Promise.all([healthQuery,reproductionQuery]);if(h.error)throw h.error;if(r.error)throw r.error
  const farmName=(relation:{name:string}|{name:string}[]|null)=>Array.isArray(relation)?relation[0]?.name??"—":relation?.name??"—"
  return {health:(h.data??[]).map(row=>({id:row.id,farmId:row.farm_id,farmName:farmName(row.farms),title:row.title,type:row.event_type,scheduledOn:row.scheduled_on,performedOn:row.performed_on,status:row.status,animalCount:row.animal_count,product:row.product,dose:row.dose,notes:row.notes})) as HealthEvent[],reproduction:(r.data??[]).map(row=>({id:row.id,farmId:row.farm_id,farmName:farmName(row.farms),type:row.event_type,eventDate:row.event_date,animalCount:row.animal_count,result:row.result,notes:row.notes})) as ReproductiveEvent[]}
 },
 async create(input:{farmId:string;title:string;type:string;scheduledOn:string;animalCount?:number;product?:string;dose?:string;notes?:string}){const user=await client().auth.getUser();if(!user.data.user)throw new Error("Sesión inválida.");const reproductive=["servicio","inseminacion","tacto","parto","destete"].includes(input.type);const result=reproductive?await client().from("reproductive_events").insert({farm_id:input.farmId,event_type:input.type,event_date:input.scheduledOn,status:"pendiente",animal_count:input.animalCount||null,result:input.title,notes:input.notes||null,created_by:user.data.user.id}):await client().from("health_events").insert({farm_id:input.farmId,title:input.title,event_type:input.type,scheduled_on:input.scheduledOn,animal_count:input.animalCount||null,product:input.product||null,dose:input.dose||null,notes:input.notes||null,created_by:user.data.user.id});if(result.error)throw result.error}
}
