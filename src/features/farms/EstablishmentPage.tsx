import { Beef, ClipboardList, Tag, MapPin, Upload } from "lucide-react"
import { PageHeader, SectionHeading, Badge } from "@/components/ui/Presentation"
import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { clientsService, type ClientRecord } from "@/services/clients.service"
import { livestockRegistryService, type AnimalRow } from "@/services/livestock-registry.service"
import { EstablishmentAnimalsTable } from "@/features/livestock/EstablishmentAnimalsTable"
import { AnimalDetail } from "@/features/livestock/LivestockRegistryPage"
import { EarTagsPage } from "@/features/ear-tags/EarTagsPage"
import { supabase } from "@/lib/supabase"
import "./establishment.css"

type Session = { id:string; title:string; session_date:string; source:string; status:string; renspaIds:string[]; animals:number }
function one<T>(value:T | T[] | null | undefined):T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined }
const tabs = [["hacienda", "Hacienda"], ["trabajos", "Trabajos realizados"], ["caravanas", "Caravanas"], ["datos", "Datos del establecimiento"]] as const
export function EstablishmentPage() {
  const { id = "" } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = tabs.some(([key]) => key === params.get("tab")) ? params.get("tab")! : "hacienda"
  const renspaId = params.get("renspa") || ""
  const [client, setClient] = useState<ClientRecord | null>(null)
  const [animals, setAnimals] = useState<AnimalRow[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<AnimalRow | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(""); setClient(null); setSelected(null)
    async function load() {
      if (!supabase) throw new Error("Supabase no está configurado.")
      const [clients, rows, result] = await Promise.all([
        clientsService.list(), livestockRegistryService.animals(),
        supabase.from("livestock_work_sessions").select("id,title,session_date,source,status,ear_tag_session_links(animal_id,ear_tags(ear_tag_ranges(ear_tag_receipts(renspa_id))))").eq("farm_id", id).order("session_date", { ascending:false })
      ])
      if (result.error) throw result.error
      const owner = clients.find(row => row.farms.some(farm => farm.id === id))
      if (!owner) throw new Error("No encontramos este establecimiento o no tenés acceso.")
      if (!active) return
      setClient(owner); setAnimals(rows.filter(row => row.farmId === id))
      setSessions((result.data ?? []).map(row => ({ ...row,
        animals: new Set(row.ear_tag_session_links.map(link => link.animal_id)).size,
        renspaIds: [...new Set(row.ear_tag_session_links.flatMap(link => {
          const registry = one(one(one(link.ear_tags)?.ear_tag_ranges)?.ear_tag_receipts)?.renspa_id
          return registry ? [registry] : []
        }))]
      })))
    }
    void load().catch(cause => { if (active) setError(cause?.message || "No pudimos abrir el establecimiento.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, attempt])
  function change(patch: Record<string,string>) { const next = new URLSearchParams(params); Object.entries(patch).forEach(([key,value]) => value ? next.set(key,value) : next.delete(key)); setParams(next) }
  const farm = client?.farms.find(row => row.id === id)
  if (loading) return <section className="page"><p role="status">Cargando establecimiento…</p></section>
  if (error || !farm || !client) return <section className="page"><Link to="/clientes">Volver a clientes</Link><div className="data-error" role="alert">{error}<button className="secondary-button" onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div></section>
  const visible = animals.filter(row => (!renspaId || row.renspas.some(registry => registry.id === renspaId)) && [row.tagNumber,row.electronicId,row.categoryName,row.herdName].join(" ").toLowerCase().includes(query.toLowerCase()))
  const works = sessions.filter(row => !renspaId || row.renspaIds.includes(renspaId))
  return <section className="page establishment-page">
    <div className="workspace-breadcrumb"><Link to={`/clientes?cliente=${client.id}`}>{client.legalName}</Link><span>/</span><strong>{farm.name}</strong></div>
    <PageHeader title={tabs.find(([key])=>key===tab)?.[1]} icon={tab==="hacienda"?<Beef size={27}/>:tab==="trabajos"?<ClipboardList size={27}/>:tab==="caravanas"?<Tag size={27}/>:<MapPin size={27}/>} description={tab==="hacienda"?"Último valor registrado por dato, con su fecha. Abrí el historial para ver todos los trabajos.":[farm.address,farm.locality,farm.province].filter(Boolean).join(" · ") || "Ubicación sin completar"} actions={<Link className="primary-button" to="/hacienda"><Upload size={17}/>Importar archivos</Link>}/>
    <div className="establishment-filter-bar"><label className="establishment-scope">RENSPA<select value={renspaId} onChange={event => change({ renspa:event.target.value })}><option value="">Todos los RENSPA</option>{farm.renspas.map(row => <option key={row.id} value={row.id}>{row.number}</option>)}</select></label>

{tab === "hacienda" && <div className="toolbar"><label className="search"><input aria-label="Buscar animales del establecimiento" placeholder="Buscar caravana o EID" value={query} onChange={event => setQuery(event.target.value)}/></label></div>}</div>
    {tab === "hacienda" && <><EstablishmentAnimalsTable key={id} farmName={farm.name} farmId={id} rows={visible} onSelect={setSelected}/></>}
    {tab === "trabajos" && <article className="panel"><SectionHeading title="Sesiones registradas" aside={`${works.length} sesiones`}/><div className="table-wrap"><table className="data-table"><thead><tr><th>Fecha del trabajo</th><th>Sesión</th><th>RENSPA</th><th>Animales vinculados</th><th>Origen</th><th>Estado</th></tr></thead><tbody>{works.map(row => <tr key={row.id}><td>{new Date(row.session_date).toLocaleDateString("es-AR", { timeZone:"America/Argentina/Buenos_Aires" })}</td><td>{row.title}</td><td>{row.renspaIds.map(registry => farm.renspas.find(item => item.id === registry)?.number).filter(Boolean).join(", ") || "Sin vínculo registrado"}</td><td>{row.animals || "Sin vínculo registrado"}</td><td>{row.source}</td><td><Badge tone={row.status==="confirmada"?"success":row.status==="anulada"?"danger":"neutral"}>{row.status}</Badge></td></tr>)}{!works.length && <tr><td colSpan={6}>Todavía no hay sesiones para esta selección.</td></tr>}</tbody></table></div></article>}
    {tab === "caravanas" && <EarTagsPage key={`${id}:${renspaId}`} farmId={id} renspaId={renspaId}/>}
    {tab === "datos" && <article className="panel"><h2>Datos y RENSPA</h2><p>Cliente: {client.legalName}</p><p>Ubicación: {[farm.address,farm.locality,farm.province].filter(Boolean).join(" · ") || "Sin completar"}</p><div className="table-wrap"><table className="data-table"><thead><tr><th>RENSPA</th><th>CUIG</th><th>CV</th></tr></thead><tbody>{farm.renspas.filter(row => !renspaId || row.id === renspaId).map(row => <tr key={row.id}><td>{row.number}</td><td>{row.cuig || "Sin completar"}</td><td>{row.cv || "Sin completar"}</td></tr>)}</tbody></table></div><Link className="secondary-button" to={`/clientes?cliente=${client.id}`}>Completar ficha o agregar RENSPA</Link></article>}
    {selected && <AnimalDetail animal={selected} onClose={() => setSelected(null)}/>}
  </section>
}
