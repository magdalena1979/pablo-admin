import { useEffect, useMemo, useState } from "react"
import { Beef, Check, CalendarDays, MapPin, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { AnimalRow } from "@/services/livestock-registry.service"
import { recordedFields } from "./animal-history"
import { readingMonth, groupMonthlyReadings, type MonthlyReading } from "./monthly-readings"
import "./establishment-animals.css"
type Value={value:string;date:string;filename:string}
type Records=Record<string,Record<string,Value>>
function one<T>(value:T|T[]|null|undefined):T|undefined{return Array.isArray(value)?value[0]:value??undefined}
const date=(value:string)=>new Date(value).toLocaleDateString("es-AR",{timeZone:"America/Argentina/Buenos_Aires"})
const animalSex = (value: string | null | undefined) => value === "macho" ? "Macho" : value === "hembra" ? "Hembra" : value || "Sexo sin completar"
export function EstablishmentAnimalsTable({farmId,rows,total,view,onViewChange,onSelect,farmName}:{farmId:string;rows:AnimalRow[];total:number;view:"latest"|"monthly";onViewChange(view:"latest"|"monthly"):void;onSelect(animal:AnimalRow):void;farmName?:string}){
 const [records,setRecords]=useState<Records>({}),[loading,setLoading]=useState(true),[error,setError]=useState("")
 const [attempt,setAttempt]=useState(0)
 const [readings,setReadings]=useState<MonthlyReading[]>([])
 const animalIds = rows.map(row => row.id).join(",")
 useEffect(()=>{const controller = new AbortController();setRecords({});setLoading(true);setError("")
 async function load(){
  if(!supabase)throw new Error("Supabase no está configurado.")
  if (!animalIds) return
  const next:Records={}
  const history:MonthlyReading[]=[]
  for(let offset=0;;offset+=1000){
   const {data,error}=await supabase.from("livestock_import_rows").select("id,animal_id,event_date,raw_data,livestock_imports!livestock_import_rows_import_id_fkey!inner(farm_id,filename,status)").eq("livestock_imports.farm_id",farmId).in("animal_id", animalIds.split(",")).in("result",["NUEVO","EXISTENTE"]).order("id").range(offset,offset+999).abortSignal(controller.signal)
   if(error)throw error
   for(const row of data??[]){
    const origin=one(row.livestock_imports)
    if(!origin||["anulada","revertida","revertido"].includes(origin.status)||!row.animal_id||!row.event_date)continue
    const raw=row.raw_data as Record<string,unknown>|null
    const values=recordedFields(raw?.rawCsv)
    history.push({id:row.id,animalId:row.animal_id,date:row.event_date,month:readingMonth(row.event_date),filename:origin.filename,fields:values})
    const current=next[row.animal_id]??={}
    for(const [field,value] of Object.entries(values)){
     if(!current[field]||new Date(row.event_date)>new Date(current[field].date))current[field]={value,date:row.event_date,filename:origin.filename}
    }
   }
   if((data?.length??0)<1000)break
  }
  if(!controller.signal.aborted){setRecords(next);setReadings(history)}
 }
 void load().catch(cause=>{if(!controller.signal.aborted)setError(cause?.message||"No pudimos cargar los datos registrados.")}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
 return()=>controller.abort()
 },[farmId,animalIds,attempt])
 const columns=useMemo(()=>[...new Set(rows.flatMap(row=>Object.keys(records[row.id]??{})))].sort((a,b)=>a.localeCompare(b,"es")),[rows,records])
 const showRenspa=new Set(rows.flatMap(row=>row.renspas.map(registry=>registry.id))).size>1
 const monthly=useMemo(()=>view === "monthly" ? groupMonthlyReadings(readings) : {},[readings,view])
 const months=useMemo(()=>[...new Set(rows.flatMap(row=>Object.keys(monthly[row.id]??{})))].sort(),[rows,monthly])
 const latestDate=rows.map(row=>row.lastEventDate).filter((value):value is string=>Boolean(value)).sort((a,b)=>new Date(b).getTime()-new Date(a).getTime())[0]
 return <section className="table-section establishment-animals">
 <div className="animal-overview-cards" aria-label="Resumen de los animales mostrados">
  <article><span className="overview-icon"><Beef size={25}/></span><div><small>Total de animales</small><strong>{total}</strong></div></article>
  <article><span className="overview-icon overview-success"><Check size={26}/></span><div><small>Activos en esta página</small><strong>{rows.filter(row=>row.status.toLowerCase()==="activo").length}</strong></div></article>
  <article><span className="overview-icon"><CalendarDays size={25}/></span><div><small>Última lectura de esta página</small><strong className="overview-date">{latestDate?date(latestDate):"Sin registros"}</strong></div></article>
  <article className="overview-farm"><span className="overview-icon"><MapPin size={25}/></span><div><small>Establecimiento</small><strong className="overview-name">{farmName||rows[0]?.farmName||"Establecimiento"}</strong></div></article>
 </div>
 {loading&&<p className="animal-desktop-only" role="status">Cargando datos de los archivos…</p>}
 <div className="animal-view-toggle" role="group" aria-label="Vista de los animales"><button aria-pressed={view==="latest"} onClick={()=>onViewChange("latest")}>Últimos valores</button><button aria-pressed={view==="monthly"} onClick={()=>onViewChange("monthly")}>Por mes</button></div>
 {error&&<div className="data-error animal-desktop-only" role="alert">{error}<button className="secondary-button" onClick={()=>setAttempt(value=>value+1)}>Reintentar</button></div>}
 <ul className="animal-mobile-list panel" aria-label="Animales">
   {rows.map(animal => <li key={animal.id}>
     <button type="button" className="animal-mobile-row" onClick={() => onSelect(animal)}
       aria-label={`Ver historial de la caravana ${animal.tagNumber}`}>
       <span className="animal-mobile-info">
         <span className="animal-mobile-main"><strong>{animal.tagNumber}</strong><span>{animalSex(animal.sex)}</span></span>
         <small>{animal.electronicId ?? animal.electronicIdRaw ?? "Sin EID"}</small>
       </span>
       <span className="animal-mobile-last">
         <span className={`animal-state${animal.status.toLowerCase() === "activo" ? " animal-state-active" : ""}`}>{animal.status}</span>
         <small>{animal.lastEventDate ? date(animal.lastEventDate) : "Sin lecturas"}</small>
       </span>
       <ChevronRight size={16} aria-hidden="true"/>
     </button>
   </li>)}
   {!rows.length && <li className="animal-mobile-empty">No hay animales para esta selección.</li>}
 </ul>
 <div className="table-wrap hacienda-animal-scroll" tabIndex={0} role="region" aria-label="Tabla de animales con desplazamiento horizontal"><table className="data-table establishment-animal-grid"><thead><tr><th>Caravana</th><th>EID</th><th>Sexo</th>{showRenspa&&<th>RENSPA</th>}<th>Última lectura / evento</th>{view==="latest"?columns.map(field=><th key={field}>{field}</th>):months.map(month=><th key={month}>{new Date(`${month}-15T12:00:00Z`).toLocaleDateString("es-AR",{month:"long",year:"numeric",timeZone:"America/Argentina/Buenos_Aires"})}</th>)}<th>Estado</th></tr></thead><tbody>{rows.map(animal=><tr key={animal.id}><td><button className="text-button animal-tag-link" aria-label={`Ver historial de la caravana ${animal.tagNumber}`} onClick={()=>onSelect(animal)}>{animal.tagNumber}<ChevronRight size={16}/></button></td><td>{animal.electronicId??animal.electronicIdRaw??"—"}</td><td>{animal.sex==="macho"?"Macho":animal.sex==="hembra"?"Hembra":animal.sex||"Sin completar"}</td>{showRenspa&&<td>{animal.renspas.map(row=>row.number).join(", ")||"Sin vínculo"}</td>}<td>{animal.lastEventDate?date(animal.lastEventDate):"—"}<small className="cell-note">{animal.lastEvent||"Sin registros"}</small></td>{view==="monthly"?months.map(month=><td key={month} className="animal-month-cell">{monthly[animal.id]?.[month]?.map(reading=><div key={reading.id} className="animal-month-reading"><button className="text-button" title={reading.filename} onClick={()=>onSelect(animal)}>{date(reading.date)} · Lectura</button>{Object.entries(reading.fields).length?<details><summary>Datos registrados</summary>{Object.entries(reading.fields).map(([key,value])=><small key={key}>{key}: {value}</small>)}<small>Origen: {reading.filename}</small></details>:<small>Sin datos adicionales</small>}</div>)||"—"}</td>):columns.map(field=>{const item=records[animal.id]?.[field];return <td key={field} title={item?`Origen: ${item.filename}`:undefined}>{item?<><strong className={field.toLowerCase()==="gestacion"?"animal-raw-trait":""}>{item.value}</strong><small className="cell-note">{date(item.date)}</small></>:"—"}</td>})}<td><span className={`animal-state${animal.status.toLowerCase()==="activo"?" animal-state-active":""}`}>{animal.status}</span></td></tr>)}{!rows.length&&<tr><td colSpan={6+(view==="monthly"?months.length:columns.length)+(showRenspa?1:0)}>No hay animales para esta selección.</td></tr>}</tbody></table></div>
 <div className="animal-table-footer">{rows.length} de {total} animales mostrados</div>
 {!loading&&!error&&columns.length>0&&<p className="establishment-values-note">Los encabezados y valores conservan los nombres originales del CSV. No se interpretan como diagnósticos ni tratamientos confirmados.</p>}
 </section>
}
