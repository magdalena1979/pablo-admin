import type { AnimalRow } from "../../services/livestock-registry.service"

export interface HaciendaFilters { clientId:string; farmId:string; renspaId:string; query:string }
export const emptyHaciendaFilters:HaciendaFilters={clientId:"",farmId:"",renspaId:"",query:""}
const text=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").trim()
export function filterHacienda(animals:AnimalRow[],filters:HaciendaFilters):AnimalRow[]{
  const query=text(filters.query)
  return animals.filter(animal=>
    (!filters.clientId||animal.clientId===filters.clientId)&&
    (!filters.farmId||animal.farmId===filters.farmId)&&
    (!filters.renspaId||animal.renspas.some(row=>row.id===filters.renspaId))&&
    (!query||text([animal.tagNumber,animal.electronicId??"",animal.electronicIdRaw??"",animal.clientName??"",animal.farmName??"",animal.categoryName??"",animal.herdName??"",...animal.renspas.map(row=>row.number)].join(" ")).includes(query))
  )
}
export function haciendaFilterOptions(animals:AnimalRow[],filters:Pick<HaciendaFilters,"clientId"|"farmId">){
  const clients=new Map<string,string>(),farms=new Map<string,string>(),renspas=new Map<string,string>()
  for(const animal of animals){
    if(animal.clientId)clients.set(animal.clientId,animal.clientName||"Cliente sin nombre")
    if(filters.clientId&&animal.clientId!==filters.clientId)continue
    farms.set(animal.farmId,`${animal.farmName||"Establecimiento sin nombre"}${!filters.clientId&&animal.clientName?` · ${animal.clientName}`:""}`)
    if(filters.farmId&&animal.farmId!==filters.farmId)continue
    animal.renspas.forEach(row=>renspas.set(row.id,`${row.number}${!filters.farmId?` · ${animal.farmName||"Establecimiento sin nombre"}${!filters.clientId&&animal.clientName?` · ${animal.clientName}`:""}`:""}`))
  }
  const options=(values:Map<string,string>)=>[...values].map(([id,label])=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label,"es",{numeric:true}))
  return{clients:options(clients),farms:options(farms),renspas:options(renspas)}
}
