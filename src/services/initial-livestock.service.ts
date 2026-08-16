import { supabase } from "@/lib/supabase"

export interface InitialLivestockOptions {
  lots:Array<{id:string;name:string;hectares:number}>
  categories:Array<{id:string;name:string}>
}

export interface InitialLivestockInput {
  farmId:string; herdName:string; lotId:string|null; categoryId:string; stage:string
  startsOn:string; hectares:number; heads:number; weight:number; price:number
  targetAdg:number; targetKgHa:number
}

function client(){if(!supabase)throw new Error("Supabase no está configurado.");return supabase}

export const initialLivestockService={
  async options(farmId:string):Promise<InitialLivestockOptions>{
    const[lots,categories]=await Promise.all([
      client().from("lots").select("id,name,hectares").eq("farm_id",farmId).eq("active",true).order("name"),
      client().from("livestock_categories").select("id,name").eq("active",true).order("name")
    ])
    if(lots.error)throw lots.error;if(categories.error)throw categories.error
    return{lots:(lots.data??[]).map(x=>({...x,hectares:Number(x.hectares)})),categories:categories.data??[]}
  },
  async create(input:InitialLivestockInput){
    const user=await client().auth.getUser();if(!user.data.user)throw new Error("Sesión inválida.")
    const campaign=await client().from("campaigns").select("id").eq("farm_id",input.farmId).eq("active",true).limit(1).single()
    if(campaign.error)throw campaign.error
    const herd=await client().from("herds").insert({farm_id:input.farmId,lot_id:input.lotId,category_id:input.categoryId,name:input.herdName.trim(),active:true}).select("id").single()
    if(herd.error)throw herd.error
    const cycle=await client().from("livestock_cycles").insert({farm_id:input.farmId,campaign_id:campaign.data.id,herd_id:herd.data.id,lot_id:input.lotId,stage:input.stage,starts_on:input.startsOn,assigned_hectares:input.hectares,opening_heads:input.heads,opening_weight_kg:input.weight,opening_price_ars_kg:input.price,closing_heads:input.heads,closing_weight_kg:input.weight,closing_price_ars_kg:input.price,target_adg_kg:input.targetAdg,target_kg_ha:input.targetKgHa,status:"activo",created_by:user.data.user.id})
    if(cycle.error){await client().from("herds").delete().eq("id",herd.data.id);throw cycle.error}
    await client().from("livestock_movements").insert({farm_id:input.farmId,campaign_id:campaign.data.id,operation:"ajuste",status:"confirmado",occurred_on:input.startsOn,animal_count:input.heads,total_weight_kg:input.weight,notes:`Existencia inicial · ${input.herdName.trim()}`,created_by:user.data.user.id})
  }
}
