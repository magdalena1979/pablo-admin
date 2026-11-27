import type { QueryData } from "@supabase/supabase-js"
import { AppSelect } from "@/components/ui/AppSelect"
import { Badge } from "@/components/ui/Presentation"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { CsvImportPanel } from "./CsvImportPanel"
import "./gallagher-files.css"
const pageSize = 20
const statuses = ["borrador", "confirmada", "anulada"]

type SavedSession={id:string;date:string;title:string;filename:string;farmId:string;farm:string;client:string;renspas:string[];male:number;female:number;animals:number;status:string}
function one<T>(value:T|T[]|null|undefined):T|undefined{return Array.isArray(value)?value[0]:value??undefined}
async function loadDestinations() {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const { data, error } = await supabase.from("farms")
    .select("id,name,clients(id,legal_name),farm_renspas(id,number)").order("name")
  if (error) throw error
  return (data ?? []).map(row => ({
    id: row.id, name: row.name, client: one(row.clients), renspas: row.farm_renspas ?? [],
  }))
}
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
 const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadDestinations>>>([])
 const [catalogError, setCatalogError] = useState(false)
 const [catalogRetry, setCatalogRetry] = useState(0)
 const [page, setPage] = useState(1)
 const [total, setTotal] = useState(0)

 useEffect(() => {
   let active = true
   setCatalogError(false)
   void loadDestinations().then(rows => {
     if (active) setCatalog(rows)
   }).catch(() => {
     if (active) setCatalogError(true)
   })
   return () => { active = false }
 }, [catalogRetry])

 useEffect(() => {
   if (!supabase) {
     setError("Supabase no está configurado.")
     setLoading(false)
     return
   }
   const controller = new AbortController()
   setLoading(true)
   setError("")
   const columns = "id,title,session_date,status,farm_id,farms(name,clients(legal_name)),livestock_imports!livestock_imports_work_session_id_fkey(filename),ear_tag_session_links(animal_id,ear_tags(ear_tag_ranges(target_sex,ear_tag_receipts(farm_renspas(number)))))"
   // Filter through a separate relationship so RENSPA does not trim the session's displayed totals.
   const summaryQuery = supabase.from("livestock_work_sessions").select(columns)
   const clientJoin = clientId ? ",client_match:farms!inner()" : ""
   const registryJoin = renspa ? ",registry_match:ear_tag_session_links!inner(ear_tags!inner(ear_tag_ranges!inner(ear_tag_receipts!inner())))" : ""
   let query = supabase.from("livestock_work_sessions")
     .select(`${columns}${clientJoin}${registryJoin}` as const, { count: "exact" }).eq("source", "gallagher")
   if (clientId) query = query.eq("client_match.client_id", clientId)
   if (farmId) query = query.eq("farm_id", farmId)
   if (renspa) query = query.eq("registry_match.ear_tags.ear_tag_ranges.ear_tag_receipts.renspa_id", renspa)
   if (status) query = query.eq("status", status)
   const offset = (page - 1) * pageSize
   void Promise.resolve(query.order("session_date", { ascending: false }).order("id")
     .range(offset, offset + pageSize - 1).abortSignal(controller.signal).overrideTypes<QueryData<typeof summaryQuery>, { merge: false }>()).then(({ data, error, count }) => {
       if (controller.signal.aborted) return
       if (error) {
         setError(error.message || "No pudimos cargar las sesiones.")
         setLoading(false)
         return
       }
       const resultCount = count ?? 0
       const lastPage = Math.max(1, Math.ceil(resultCount / pageSize))
       if (page > lastPage) {
         setPage(lastPage)
         return
       }
       setTotal(resultCount)
       setSessions((data ?? []).map(row => {
         const tags = [...new Map(row.ear_tag_session_links.map(link =>
           [link.animal_id, one(one(link.ear_tags)?.ear_tag_ranges)])).values()]
         const farm = one(row.farms)
         return {
           id: row.id, date: row.session_date, title: row.title, status: row.status,
           farmId: row.farm_id, farm: farm?.name ?? "Sin vínculo",
           client: one(farm?.clients)?.legal_name ?? "Sin vínculo",
           filename: row.livestock_imports.map(item => item.filename).join(", "),
           animals: tags.length, male: tags.filter(tag => tag?.target_sex === "macho").length,
           female: tags.filter(tag => tag?.target_sex === "hembra").length,
           renspas: [...new Set(tags.map(tag => one(one(tag?.ear_tag_receipts)?.farm_renspas)?.number)
             .filter((number): number is string => Boolean(number)))],
         }
       }))
       setLoading(false)
     }).catch(() => {
       if (!controller.signal.aborted) {
         setError("No pudimos cargar las sesiones.")
         setLoading(false)
       }
     })
   return () => controller.abort()
 }, [clientId, farmId, renspa, status, page, reload])

 const clients = [...new Map(catalog.flatMap(({ client }) =>
   client ? [[client.id, client.legal_name] as const] : []
 )).entries()].sort((a, b) => a[1].localeCompare(b[1], "es"))
 const farms = catalog.filter(farm => !clientId || farm.client?.id === clientId)
 const renspas = farms.filter(farm => !farmId || farm.id === farmId).flatMap(farm => farm.renspas)
 const pages = Math.max(1, Math.ceil(total / pageSize))
 return <section className="page compact-list-page gallagher-files-page">
 <CsvImportPanel key={sharedCsvId} sharedCsvId={sharedCsvId} pageTitle="Sesiones de Gallagher" onConfirmed={() => { setPage(1); setReload(value => value + 1) }}/>
 {catalogError && <div className="data-error" role="alert">No pudimos cargar los destinos.
   <button className="secondary-button" onClick={() => setCatalogRetry(value => value + 1)}>Reintentar</button>
 </div>}
 <div className="toolbar compact-list-filters gallagher-filters">
   <AppSelect aria-label="Filtrar por cliente" value={clientId} onChange={event => {
     setClientId(event.target.value); setFarmId(""); setRenspa(""); setPage(1)
   }}>
     <option value="">Cliente</option>
     {clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
   </AppSelect>
   <AppSelect aria-label="Filtrar por establecimiento" value={farmId} onChange={event => {
     setFarmId(event.target.value); setRenspa(""); setPage(1)
   }}>
     <option value="">Establecimiento</option>
     {farms.map(farm => <option key={farm.id} value={farm.id}>{[farm.name, farm.client?.legal_name].filter(Boolean).join(" · ")}</option>)}
   </AppSelect>
   <AppSelect aria-label="Filtrar por RENSPA" value={renspa} onChange={event => { setRenspa(event.target.value); setPage(1) }}>
     <option value="">RENSPA</option>
     {renspas.map(registry => <option key={registry.id} value={registry.id}>{registry.number}</option>)}
   </AppSelect>
   <AppSelect aria-label="Filtrar por estado" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
     <option value="">Estado</option>
     {statuses.map(value => <option key={value}>{value}</option>)}
   </AppSelect>
 </div>
 {loading ? <div className="loading-panel" role="status">Cargando sesiones…</div> : error ?
   <div className="data-error" role="alert">{error}<button className="secondary-button" onClick={() => setReload(value => value + 1)}>Reintentar</button></div> : <>
     <div className="panel data-panel gallagher-desktop-table">
       <div className="table-wrap">
         <table className="data-table" aria-label="Sesiones de Gallagher">
           <thead><tr>
             <th scope="col">Fecha del trabajo</th><th scope="col">Archivo / sesión</th><th scope="col">Cliente</th>
             <th scope="col">Establecimiento</th><th scope="col">RENSPA</th><th scope="col">Animales vinculados</th>
             <th scope="col">Machos</th><th scope="col">Hembras</th><th scope="col">Estado</th>
           </tr></thead>
           <tbody>
             {sessions.map(row => <tr key={row.id}>
               <td>{sessionDate(row.date)}</td>
               <td>{row.filename || row.title}</td><td>{row.client}</td>
               <td><Link to={`/establecimientos/${row.farmId}?tab=trabajos`}>{row.farm} →</Link></td>
               <td>{row.renspas.join(", ") || "Sin vínculo registrado"}</td><td>{row.animals || "Sin vínculo registrado"}</td>
               <td>{row.male}</td><td>{row.female}</td>
               <td><SessionStatus status={row.status}/></td>
             </tr>)}
             {!sessions.length && <tr><td colSpan={9}>No hay sesiones para mostrar.</td></tr>}
           </tbody>
         </table>
       </div>
     </div>
     <ul className="gallagher-mobile-sessions" aria-label="Sesiones de Gallagher">
       {sessions.map(row => <li key={row.id} className="panel">
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
       {!sessions.length && <li className="panel">No hay sesiones para mostrar.</li>}
     </ul>
     {total > 0 && <nav className="gallagher-pagination" aria-label="Paginación de sesiones">
       <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} sesiones</span>
       <div>
         <button type="button" className="secondary-button" disabled={page === 1}
           onClick={() => setPage(value => value - 1)}>Anterior</button>
         <span aria-current="page">Página {page} de {pages}</span>
         <button type="button" className="secondary-button" disabled={page === pages}
           onClick={() => setPage(value => value + 1)}>Siguiente</button>
       </div>
     </nav>}
   </>}
 </section>
}
