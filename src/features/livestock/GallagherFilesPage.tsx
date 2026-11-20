import { Badge } from "@/components/ui/Presentation"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { CsvImportPanel } from "./CsvImportPanel"
type SavedSession={id:string;date:string;title:string;filename:string;farmId:string;farm:string;client:string;renspas:string;male:number;female:number;animals:number;status:string}
function one<T>(value:T|T[]|null|undefined):T|undefined{return Array.isArray(value)?value[0]:value??undefined}
export function GallagherFilesPage(){
 const {sharedCsvId}=useParams()
 const [sessions,setSessions]=useState<SavedSession[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("")
 const [reload,setReload]=useState(0),[query,setQuery]=useState("")
 useEffect(()=>{let active=true;setLoading(true);setError("")
 async function load(){
  if(!supabase)throw new Error("Supabase no está configurado.")
  const rows:SavedSession[]=[]
  for(let offset=0;;offset+=500){
   const {data,error}=await supabase.from("livestock_work_sessions").select("id,title,session_date,status,farm_id,farms(name,clients(legal_name)),livestock_imports!livestock_imports_work_session_id_fkey(filename),ear_tag_session_links(animal_id,ear_tags(ear_tag_ranges(target_sex,ear_tag_receipts(farm_renspas(number)))))").eq("source","gallagher").order("session_date",{ascending:false}).order("id").range(offset,offset+499)
   if(error)throw error
   for(const row of data??[]){
    const tags=new Map(row.ear_tag_session_links.map(link=>[link.animal_id,one(one(link.ear_tags)?.ear_tag_ranges)]))
    const farm=one(row.farms)
    rows.push({id:row.id,date:row.session_date,title:row.title,status:row.status,farmId:row.farm_id,farm:farm?.name??"Sin vínculo",client:one(farm?.clients)?.legal_name??"Sin vínculo",filename:row.livestock_imports.map(item=>item.filename).join(", "),animals:tags.size,male:[...tags.values()].filter(tag=>tag?.target_sex==="macho").length,female:[...tags.values()].filter(tag=>tag?.target_sex==="hembra").length,renspas:[...new Set([...tags.values()].map(tag=>one(one(tag?.ear_tag_receipts)?.farm_renspas)?.number).filter(Boolean))].join(", ")})
   }
   if((data?.length??0)<500)break
  }
  if(active)setSessions(rows)
 }
 void load().catch(cause=>{if(active)setError(cause?.message||"No pudimos cargar las sesiones.")}).finally(()=>{if(active)setLoading(false)})
 return()=>{active=false}
 },[reload])
 const visible=sessions.filter(row=>[row.filename,row.title,row.client,row.farm,row.renspas].join(" ").toLowerCase().includes(query.toLowerCase()))
 return <section className="page">
 <CsvImportPanel key={sharedCsvId} sharedCsvId={sharedCsvId} pageTitle="Sesiones de Gallagher" onConfirmed={()=>setReload(value=>value+1)}/>
 <section className="panel" style={{padding:20,marginTop:24}}>
 <div className="toolbar"><label className="search"><input aria-label="Buscar sesiones" placeholder="Buscar archivo, cliente, campo o RENSPA" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
 {loading?<p role="status">Cargando sesiones…</p>:error?<div className="data-error" role="alert">{error}<button className="secondary-button" onClick={()=>setReload(value=>value+1)}>Reintentar</button></div>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Fecha del trabajo</th><th>Archivo / sesión</th><th>Cliente</th><th>Establecimiento</th><th>RENSPA</th><th>Animales vinculados</th><th>Machos</th><th>Hembras</th><th>Estado</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td>{new Date(row.date).toLocaleDateString("es-AR",{timeZone:"America/Argentina/Buenos_Aires"})}</td><td>{row.filename||row.title}</td><td>{row.client}</td><td><Link to={`/establecimientos/${row.farmId}?tab=trabajos`}>{row.farm} →</Link></td><td>{row.renspas||"Sin vínculo registrado"}</td><td>{row.animals||"Sin vínculo registrado"}</td><td>{row.male}</td><td>{row.female}</td><td><Badge tone={row.status==="confirmada"?"success":row.status==="anulada"?"danger":"neutral"}>{row.status}</Badge></td></tr>)}{!visible.length&&<tr><td colSpan={9}>No hay sesiones guardadas para esta búsqueda.</td></tr>}</tbody></table></div>}
 </section></section>
}
