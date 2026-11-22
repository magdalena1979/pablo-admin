import { AppSelect } from "@/components/ui/AppSelect"
import { Plus, Upload } from "lucide-react"
import { PageHeader, Badge } from "@/components/ui/Presentation"
import { useEffect, useState, type ReactNode } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { clientsService, type ClientRecord } from "@/services/clients.service"
import { livestockRegistryService, type AnimalRow } from "@/services/livestock-registry.service"
import { EstablishmentAnimalsTable } from "@/features/livestock/EstablishmentAnimalsTable"
import { AnimalDetail } from "@/features/livestock/LivestockRegistryPage"
import { EarTagsPage } from "@/features/ear-tags/EarTagsPage"
import { useAuth } from "@/app/providers/AuthProvider"
import { WorkDialog } from "@/features/operations/ProfessionalWorksPage"
import { professionalWorksService } from "@/services/professional-works.service"
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
  const isHacienda = tab === "hacienda"
  const isCaravanas = tab === "caravanas"
  const isData = tab === "datos"
  const renspaFilter = <AppSelect aria-label="Filtrar por RENSPA" value={renspaId} onChange={event => change({ renspa: event.target.value })}>
    <option value="">Todos los RENSPA</option>
    {farm.renspas.map(row => <option key={row.id} value={row.id}>{row.number}</option>)}
  </AppSelect>
  return <section className={`page establishment-page compact-list-page${isHacienda ? " establishment-hacienda" : ""}`} aria-label={tabs.find(([key]) => key === tab)?.[1]}>
    {isHacienda && <div className="compact-list-heading"><PageHeader title="Hacienda" actions={
      <Link className="primary-button" to="/hacienda"><Upload size={17}/>Importar archivos</Link>
    }/></div>}
    {isHacienda ? <div className="toolbar compact-list-filters">
      {renspaFilter}
      <label className="search"><input type="search" aria-label="Buscar animales del establecimiento" placeholder="Caravana o EID" value={query} onChange={event => setQuery(event.target.value)}/></label>
    </div> : null}
    {tab === "hacienda" && <><EstablishmentAnimalsTable key={id} farmName={farm.name} farmId={id} rows={visible} onSelect={setSelected}/></>}
    {tab === "trabajos" && <EstablishmentWorks key={id} farm={farm} sessions={works}
      renspaFilter={farm.renspas.length > 1 || renspaId ? renspaFilter : null}/>}
    {isCaravanas && <EarTagsPage key={id} farmId={id} renspaId={renspaId} onRenspaChange={value => change({ renspa: value })}/>}
    {isData && <>
      <div className="compact-list-heading establishment-data-heading"><PageHeader title="Datos del establecimiento"/></div>
      {(farm.renspas.length > 1 || renspaId) && <div className="toolbar compact-list-filters">{renspaFilter}</div>}
      <div className="panel establishment-data-panel">
        <dl><dt>Cliente</dt><dd>{client.legalName}</dd><dt>Ubicación</dt>
          <dd>{[farm.address, farm.locality, farm.province].filter(Boolean).join(" · ") || "Sin completar"}</dd></dl>
        <div className="table-wrap"><table className="data-table" aria-label="RENSPA del establecimiento">
          <thead><tr><th scope="col">RENSPA</th><th scope="col">CUIG</th><th scope="col">CV</th></tr></thead>
          <tbody>{farm.renspas.filter(row => !renspaId || row.id === renspaId).map(row =>
            <tr key={row.id}><td>{row.number}</td><td>{row.cuig || "—"}</td><td>{row.cv || "—"}</td></tr>)}
            {!farm.renspas.some(row => !renspaId || row.id === renspaId) && <tr><td colSpan={3}>No hay RENSPA para mostrar.</td></tr>}
          </tbody>
        </table></div>
        <Link className="secondary-button" to={`/clientes?cliente=${client.id}`}>Completar ficha o agregar RENSPA</Link>
      </div>
    </>}
    {selected && <AnimalDetail animal={selected} onClose={() => setSelected(null)}/>}
  </section>
}

function EstablishmentWorks({ farm, sessions, renspaFilter }: {
  farm: ClientRecord["farms"][number]; sessions: Session[]; renspaFilter: ReactNode
}) {
  const { profile } = useAuth()
  const canRegister = profile?.role === "super_admin"
  const [manual, setManual] = useState<Awaited<ReturnType<typeof professionalWorksService.list>>>([])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<(typeof manual)[number] | null>(null)
  const [loading, setLoading] = useState(canRegister)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!canRegister) return
    let active = true
    setLoading(true)
    setError("")
    void professionalWorksService.list(farm.id).then(rows => {
      if (active) setManual(rows.filter(row => !row.professional_work_sessions.length))
    }).catch(() => {
      if (active) setError("No pudimos cargar los trabajos manuales.")
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [canRegister, farm.id, revision])

  const rows = [
    ...sessions.map(row => ({
      id: `session:${row.id}`, title: row.title, date: row.session_date,
      dateLabel: row.source === "gallagher"
        ? row.session_date.slice(0, 10).split("-").reverse().join("/")
        : new Date(row.session_date).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
      source: row.source === "gallagher" ? "Gallagher" : row.source,
      status: row.status, animals: row.animals || "—",
      renspa: row.renspaIds.map(id => farm.renspas.find(item => item.id === id)?.number).filter(Boolean).join(", ") || "—",
      editable: null,
    })),
    ...(canRegister ? manual : []).map(row => ({
      id: `work:${row.id}`, title: row.description, date: row.work_date, dateLabel: row.work_date.split("-").reverse().join("/"),
      source: "Manual", status: "registrado", animals: "—", renspa: "—", editable: row.invoiced ? null : row,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  function badge(status: string) {
    return <Badge tone={status === "confirmada" || status === "registrado" ? "success" : status === "anulada" ? "danger" : "neutral"}>{status}</Badge>
  }

  return <div className="establishment-works">
    <div className="compact-list-heading">
      <PageHeader title="Trabajos realizados" actions={canRegister && <>
        <button type="button" className="primary-button" onClick={() => setCreating(true)}>
          <Plus size={17} aria-hidden="true"/>Trabajo manual
        </button>
        <Link className="secondary-button" to={`/trabajos?${new URLSearchParams({ establecimiento: farm.id })}`}>Facturación</Link>
      </>}/>
    </div>
    {renspaFilter && <div className="toolbar compact-list-filters">{renspaFilter}</div>}
    {canRegister && loading && <p role="status">Cargando trabajos manuales…</p>}
    {canRegister && error && <div className="data-error" role="alert">{error}
      <button type="button" className="secondary-button" onClick={() => setRevision(value => value + 1)}>Reintentar</button>
    </div>}
    <div className="panel data-panel establishment-works-table"><div className="table-wrap">
      <table className="data-table" aria-label="Trabajos realizados">
        <thead><tr><th scope="col">Fecha</th><th scope="col">Trabajo</th><th scope="col">RENSPA</th>
          <th scope="col">Animales vinculados</th><th scope="col">Origen</th><th scope="col">Estado</th>{canRegister && <th scope="col">Acción</th>}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}><td>{row.dateLabel}</td><td>{row.title}</td><td>{row.renspa}</td>
          <td>{row.animals}</td><td>{row.source}</td><td>{badge(row.status)}</td>
          {canRegister && <td>{row.editable && <button type="button" className="table-action" onClick={() => setEditing(row.editable)}>Editar</button>}</td>}</tr>)}
          {!rows.length && <tr><td colSpan={canRegister ? 7 : 6}>No hay trabajos para mostrar.</td></tr>}
        </tbody>
      </table>
    </div></div>
    <ul className="establishment-works-list" aria-label="Trabajos realizados">
      {rows.map(row => <li className="panel" key={row.id}>
        <div>{row.dateLabel} · {row.source}{badge(row.status)}</div>
        <strong>{row.title}</strong>
        {row.renspa !== "—" && <p>RENSPA {row.renspa}</p>}
        {row.animals !== "—" && <p>{row.animals} animales vinculados</p>}
        {row.editable && <button type="button" className="table-action" onClick={() => setEditing(row.editable)}>Editar</button>}
      </li>)}
      {!rows.length && <li className="panel">No hay trabajos para mostrar.</li>}
    </ul>
    {canRegister && (creating || editing) && <WorkDialog key={editing?.id ?? "new"} fixedFarm={farm} editing={editing ?? undefined}
      onClose={() => { setCreating(false); setEditing(null) }} onSaved={() => {
      setCreating(false); setEditing(null)
      setRevision(value => value + 1)
    }}/>}
  </div>
}
