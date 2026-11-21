import { Badge } from "@/components/ui/Presentation"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { CsvImportPanel } from "./CsvImportPanel"
import "./gallagher-files.css"
type SavedSession={id:string;date:string;title:string;filename:string;farmId:string;farm:string;clientId:string;client:string;renspas:string[];male:number;female:number;animals:number;status:string}
function one<T>(value:T|T[]|null|undefined):T|undefined{return Array.isArray(value)?value[0]:value??undefined}
function sessionDate(value: string) { return value.slice(0, 10).split("-").reverse().join("/") }
function SessionStatus({ status }: { status: string }) {
 return <Badge tone={status === "confirmada" ? "success" : status === "anulada" ? "danger" : "neutral"}>{status}</Badge>
}
export function GallagherFilesPage(){
 const {sharedCsvId}=useParams()
 const [sessions,setSessions]=useState<SavedSession[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("")
 const [reload,setReload]=useState(0)
 const [clientId,setClientId]=useState(""),[farmId,setFarmId]=useState("")
 const [renspa,setRenspa]=useState(""),[status,setStatus]=useState("")
 const [filtersOpen, setFiltersOpen] = useState(false)
 useEffect(()=>{let active=true;setLoading(true);setError("")
 async function load(){
  if(!supabase)throw new Error("Supabase no está configurado.")
  const rows:SavedSession[]=[]
  for(let offset=0;;offset+=500){
   const {data,error}=await supabase.from("livestock_work_sessions").select("id,title,session_date,status,farm_id,farms(name,clients(id,legal_name)),livestock_imports!livestock_imports_work_session_id_fkey(filename),ear_tag_session_links(animal_id,ear_tags(ear_tag_ranges(target_sex,ear_tag_receipts(farm_renspas(number)))))").eq("source","gallagher").order("session_date",{ascending:false}).order("id").range(offset,offset+499)
   if(error)throw error
   for(const row of data??[]){
    const tags=new Map(row.ear_tag_session_links.map(link=>[link.animal_id,one(one(link.ear_tags)?.ear_tag_ranges)]))
    const farm=one(row.farms)
    const client=one(farm?.clients)
    rows.push({id:row.id,date:row.session_date,title:row.title,status:row.status,farmId:row.farm_id,farm:farm?.name??"Sin vínculo",clientId:client?.id??"",client:client?.legal_name??"Sin vínculo",filename:row.livestock_imports.map(item=>item.filename).join(", "),animals:tags.size,male:[...tags.values()].filter(tag=>tag?.target_sex==="macho").length,female:[...tags.values()].filter(tag=>tag?.target_sex==="hembra").length,renspas:[...new Set([...tags.values()].map(tag=>one(one(tag?.ear_tag_receipts)?.farm_renspas)?.number).filter((number): number is string => Boolean(number)))]})
   }
   if((data?.length??0)<500)break
  }
  if(active)setSessions(rows)
 }
 void load().catch(cause=>{if(active)setError(cause?.message||"No pudimos cargar las sesiones.")}).finally(()=>{if(active)setLoading(false)})
 return()=>{active=false}
 },[reload])
 const clients = new Map(sessions.filter(row => row.clientId).map(row => [row.clientId, row.client]))
 const clientSessions = sessions.filter(row => !clientId || row.clientId === clientId)
 const farms = new Map(clientSessions.map(row => [row.farmId, `${row.farm} · ${row.client}`]))
 const farmSessions = clientSessions.filter(row => !farmId || row.farmId === farmId)
 const renspas = [...new Set(farmSessions.flatMap(row => row.renspas))]
 const statuses = [...new Set(sessions.map(row => row.status))]
 const visible = farmSessions.filter(row => (!renspa || row.renspas.includes(renspa)) && (!status || row.status === status))
 const filterCount = [clientId, farmId, renspa, status].filter(Boolean).length
 return <section className="page compact-list-page gallagher-files-page">
 <CsvImportPanel key={sharedCsvId} sharedCsvId={sharedCsvId} pageTitle="Sesiones de Gallagher" onConfirmed={()=>setReload(value=>value+1)}/>
 {loading ? <div className="loading-panel" role="status">Cargando sesiones…</div> : error ?
   <div className="data-error" role="alert">{error}<button className="secondary-button" onClick={()=>setReload(value=>value+1)}>Reintentar</button></div> : <>
     <button type="button" className="secondary-button gallagher-filter-toggle" aria-expanded={filtersOpen}
       aria-controls="gallagher-filters" onClick={() => setFiltersOpen(value => !value)}>
       Filtros{filterCount > 0 && ` (${filterCount})`}
     </button>
     <div id="gallagher-filters" className="toolbar compact-list-filters" data-expanded={filtersOpen}>
       <select aria-label="Filtrar por cliente" value={clientId} onChange={event => { setClientId(event.target.value); setFarmId(""); setRenspa("") }}>
         <option value="">Cliente</option>
         {[...clients].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
       </select>
       <select aria-label="Filtrar por establecimiento" value={farmId} onChange={event => { setFarmId(event.target.value); setRenspa("") }}>
         <option value="">Establecimiento</option>
         {[...farms].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
       </select>
       <select aria-label="Filtrar por RENSPA" value={renspa} onChange={event => setRenspa(event.target.value)}>
         <option value="">RENSPA</option>
         {renspas.map(number => <option key={number}>{number}</option>)}
       </select>
       <select aria-label="Filtrar por estado" value={status} onChange={event => setStatus(event.target.value)}>
         <option value="">Estado</option>
         {statuses.map(value => <option key={value}>{value}</option>)}
       </select>
     </div>
     <div className="panel data-panel gallagher-desktop-table">
       <div className="table-wrap">
         <table className="data-table" aria-label="Sesiones de Gallagher">
           <thead><tr>
             <th scope="col">Fecha del trabajo</th><th scope="col">Archivo / sesión</th><th scope="col">Cliente</th>
             <th scope="col">Establecimiento</th><th scope="col">RENSPA</th><th scope="col">Animales vinculados</th>
             <th scope="col">Machos</th><th scope="col">Hembras</th><th scope="col">Estado</th>
           </tr></thead>
           <tbody>
             {visible.map(row => <tr key={row.id}>
               <td>{sessionDate(row.date)}</td>
               <td>{row.filename || row.title}</td><td>{row.client}</td>
               <td><Link to={`/establecimientos/${row.farmId}?tab=trabajos`}>{row.farm} →</Link></td>
               <td>{row.renspas.join(", ") || "Sin vínculo registrado"}</td><td>{row.animals || "Sin vínculo registrado"}</td>
               <td>{row.male}</td><td>{row.female}</td>
               <td><SessionStatus status={row.status}/></td>
             </tr>)}
             {!visible.length && <tr><td colSpan={9}>No hay sesiones para mostrar.</td></tr>}
           </tbody>
         </table>
       </div>
     </div>
     <ul className="gallagher-mobile-sessions" aria-label="Sesiones de Gallagher">
       {visible.map(row => <li key={row.id} className="panel">
         <div className="gallagher-session-date"><time dateTime={row.date.slice(0, 10)}>{sessionDate(row.date)}</time><SessionStatus status={row.status}/></div>
         <strong className="gallagher-session-file">{row.filename || row.title}</strong>
         <p><Link to={`/establecimientos/${row.farmId}?tab=trabajos`}>{row.farm}</Link> · {row.client}</p>
         <details>
           <summary>Ver detalle</summary>
           <dl>
             <dt>RENSPA</dt><dd>{row.renspas.join(", ") || "Sin vínculo registrado"}</dd>
             <dt>Animales vinculados</dt><dd>{row.animals || "Sin vínculo registrado"}</dd>
             <dt>Machos</dt><dd>{row.male}</dd>
             <dt>Hembras</dt><dd>{row.female}</dd>
           </dl>
         </details>
       </li>)}
       {!visible.length && <li className="panel">No hay sesiones para mostrar.</li>}
     </ul>
   </>}
 </section>
}
