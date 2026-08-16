import { supabase } from "@/lib/supabase"

export interface StockItem { id:string; farmId:string; farmName:string; name:string; kind:string; unit:string; location:string; campaign:string|null; minimum:number; value:number; physical:number|null; countedAt:string|null; theoretical:number; reserved:number; available:number; difference:number|null }
export interface StockMovement { id:string; itemId:string; date:string; type:string; quantity:number; concept:string; reference:string|null }
export interface NewStockItem { farmId:string; name:string; kind:string; unit:string; location:string; campaign?:string; opening:number; minimum:number; value:number }

function client(){if(!supabase)throw new Error("Supabase no está configurado.");return supabase}

export const inventoryService = {
  async list(farmId?:string|null):Promise<StockItem[]> {
    let query=client().from("inventory_position").select("*").order("farm_name").order("kind").order("name")
    if(farmId)query=query.eq("farm_id",farmId)
    const{data,error}=await query
    if(error)throw error
    return(data??[]).map(x=>({id:x.id,farmId:x.farm_id,farmName:x.farm_name,name:x.name,kind:x.kind,unit:x.unit,location:x.location,campaign:x.origin_campaign,minimum:Number(x.minimum_quantity),value:Number(x.unit_value_ars),physical:x.physical_count==null?null:Number(x.physical_count),countedAt:x.counted_at,theoretical:Number(x.theoretical_quantity),reserved:Number(x.reserved_quantity),available:Number(x.available_quantity),difference:x.count_difference==null?null:Number(x.count_difference)}))
  },
  async create(input:NewStockItem) {
    const user=await client().auth.getUser()
    if(!user.data.user)throw new Error("Sesión inválida.")
    const{error}=await client().from("inventory_items").insert({farm_id:input.farmId,name:input.name.trim(),kind:input.kind,unit:input.unit.trim(),location:input.location.trim(),origin_campaign:input.campaign?.trim()||null,opening_quantity:input.opening,minimum_quantity:input.minimum,unit_value_ars:input.value,physical_count:input.opening,counted_at:new Date().toISOString().slice(0,10),created_by:user.data.user.id})
    if(error)throw error
  },
  async movements(itemId:string):Promise<StockMovement[]> {
    const{data,error}=await client().from("inventory_movements").select("id,item_id,movement_date,movement_type,quantity,concept,reference").eq("item_id",itemId).order("movement_date",{ascending:false})
    if(error)throw error
    return(data??[]).map(x=>({id:x.id,itemId:x.item_id,date:x.movement_date,type:x.movement_type,quantity:Number(x.quantity),concept:x.concept,reference:x.reference}))
  },
  async record(input:{itemId:string;date:string;type:string;quantity:number;concept:string;reference?:string}) {
    const{error}=await client().rpc("record_inventory_movement",{p_item_id:input.itemId,p_date:input.date,p_type:input.type,p_quantity:input.quantity,p_concept:input.concept,p_reference:input.reference??null,p_work_order_id:null})
    if(error)throw error
  }
}
