import { AppSelect } from "@/components/ui/AppSelect"
import { Plus, Upload } from "lucide-react"
import { PageHeader, Badge } from "@/components/ui/Presentation"
import { Component, useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { clientsService, type ClientRecord } from "@/services/clients.service"
import { establishmentPageSize, livestockRegistryService, type AnimalRow, type OverviewAnimal } from "@/services/livestock-registry.service"
import { EstablishmentAnimalsTable } from "@/features/livestock/EstablishmentAnimalsTable"
import { AnimalDetail } from "@/features/livestock/LivestockRegistryPage"
import { EarTagsPage } from "@/features/ear-tags/EarTagsPage"
import { useAuth } from "@/app/providers/AuthProvider"
import { WorkDialog } from "@/features/operations/ProfessionalWorksPage"
import { professionalWorksService } from "@/services/professional-works.service"
import { supabase } from "@/lib/supabase"
import { CsvImportPanel } from "@/features/livestock/CsvImportPanel"
import { correctGallagherSessionType } from "./cria-tacto.service"
import { csvSessionTypes, gallagherSessionTitle, isCsvSessionType, type CsvSessionType } from "@/features/livestock/csv-confirmation"
import { CriaHealth } from "./CriaHealth"
import { LivestockOverview } from "./LivestockOverview"
import { LivestockProfilePanel } from "./LivestockProfilePanel"
import "./establishment.css"

type Session = { id:string; title:string; session_date:string; session_type:string; source:string; status:string }
function one<T>(value:T | T[] | null | undefined):T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined }
const tabs = [["hacienda", "Hacienda"], ["animales", "Animales"], ["sanidad", "Sanidad"], ["trabajos", "Trabajos realizados"], ["caravanas", "Caravanas"], ["datos", "Datos del establecimiento"], ["importar", "Importar CSV"]] as const
async function loadOwner(id: string) {
  const [owner] = await clientsService.list(id)
  if (!owner) throw new Error("No encontramos este establecimiento o no tenés acceso.")
  return owner
}

async function loadSessions(id: string, renspaId: string, signal: AbortSignal): Promise<Session[]> {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const registry = renspaId
    ? ",registry_match:ear_tag_session_links!inner(ear_tags!inner(ear_tag_ranges!inner(ear_tag_receipts!inner())))"
    : ""
  const sessions: Session[] = []
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from("livestock_work_sessions")
      .select("id,title,session_date,session_type,source,status" + registry).eq("farm_id", id)
    if (renspaId) query = query.eq("registry_match.ear_tags.ear_tag_ranges.ear_tag_receipts.renspa_id", renspaId)
    const { data, error } = await query.order("session_date", { ascending: false }).order("id")
      .range(offset, offset + 499).abortSignal(signal).overrideTypes<Session[], { merge: false }>()
    if (error) throw error
    sessions.push(...(data ?? []))
    if ((data?.length ?? 0) < 500) return sessions
  }
}

type WorkLinks = { animals: number; renspaIds: string[] }

async function loadWorkLinks(farmId: string, ids: string[], signal: AbortSignal) {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const summary = await supabase.rpc("summarize_establishment_work_links", {
    p_farm_id: farmId, p_session_ids: ids,
  }).abortSignal(signal)
  if (!summary.error) {
    return new Map<string, WorkLinks>((summary.data as {
      session_id: string; animals: number; renspa_ids: string[]
    }[] ?? []).map(row => [row.session_id, { animals: row.animals, renspaIds: row.renspa_ids }]))
  }
  if (summary.error.code !== "PGRST202") throw summary.error
  const links = new Map<string, { animals: Set<string>; renspaIds: Set<string> }>()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("ear_tag_session_links")
      .select("session_id,animal_id,ear_tags(ear_tag_ranges(ear_tag_receipts(renspa_id)))")
      .in("session_id", ids).order("session_id").order("tag_id").order("import_id")
      .range(offset, offset + 999).abortSignal(signal)
    if (error) throw error
    for (const row of data ?? []) {
      const session = links.get(row.session_id) ?? { animals: new Set<string>(), renspaIds: new Set<string>() }
      session.animals.add(row.animal_id)
      const registry = one(one(one(row.ear_tags)?.ear_tag_ranges)?.ear_tag_receipts)?.renspa_id
      if (registry) session.renspaIds.add(registry)
      links.set(row.session_id, session)
    }
    if ((data?.length ?? 0) < 1000) {
      return new Map<string, WorkLinks>([...links].map(([id, row]) =>
        [id, { animals: row.animals.size, renspaIds: [...row.renspaIds] }]))
    }
  }
}

function useEstablishmentData<T>(id: string, enabled: boolean, load: (id: string) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled || data !== null || error) return
    let active = true
    void load(id).then(result => {
      if (active) setData(result)
    }).catch(cause => {
      if (active) setError(cause?.message || "No pudimos cargar estos datos.")
    })
    return () => { active = false }
  }, [id, enabled, load, data, error, attempt])
  return { data, setData, error, loading: enabled && data === null && !error, retry: () => {
    setError("")
    setAttempt(value => value + 1)
  } }
}

class OverviewBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="data-error" role="alert">{message}
    <button className="secondary-button" onClick={retry}>Reintentar</button>
  </div>
}

export function EstablishmentPage() {
  const { id = "" } = useParams()
  const { session } = useAuth()
  return <EstablishmentContent key={`${session?.user.id ?? ""}:${id}`} id={id}/>
}

function EstablishmentContent({ id }: { id: string }) {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const tabParam = params.get("tab") || "hacienda"
  const tab = tabParam === "hacienda" && params.get("vista") === "animales" ? "animales" :
    tabs.some(([key]) => key === tabParam) ? tabParam : "hacienda"
  const renspaId = params.get("renspa") || ""
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [animalView, setAnimalView] = useState<"latest" | "monthly">("latest")
  const [pageRequest, retryPage] = useState(0)
  const [pageError, setPageError] = useState("")
  type AnimalPage = Awaited<ReturnType<typeof livestockRegistryService.establishmentPage>>
  const [loadedPage, setLoadedPage] = useState<{ key: string; data: AnimalPage } | null>(null)
  const pageCache = useRef(new Map<string, { data: AnimalPage; expires: number }>())
  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(1) }, 250)
    return () => window.clearTimeout(timer)
  }, [query])
  const [selected, setSelected] = useState<AnimalRow | null>(null)
  const owner = useEstablishmentData(id, true, loadOwner)
  const client = owner.data
  const farm = client?.farms.find(row => row.id === id)
  const isHacienda = tab === "hacienda" || tab === "animales"
  const [healthVisited, setHealthVisited] = useState(false)
  const [healthRevision, setHealthRevision] = useState(0)
  useEffect(() => { if (tab === "sanidad") setHealthVisited(true) }, [tab])
  const [keepOverview, setKeepOverview] = useState(false)
  const showOverview = !!farm?.livestockProfile.primary && tab === "hacienda"
  useEffect(() => { if (showOverview) setKeepOverview(true) }, [showOverview])
  const mountOverview = (showOverview || keepOverview) && !!farm?.livestockProfile.primary
  const hasGrowthOverview = mountOverview && !!farm?.livestockProfile.activities.some(activity => activity !== "cria")
  const [overview, setOverview] = useState<{ renspaId: string; rows: OverviewAnimal[] | null; error: string } | null>(null)
  const [overviewAttempt, retryOverview] = useState(0)
  const currentOverview = overview?.renspaId === renspaId ? overview : null
  useEffect(() => {
    if (!hasGrowthOverview) return
    const controller = new AbortController()
    const timeout = AbortSignal.timeout(15_000)
    const signal = AbortSignal.any([controller.signal, timeout])
    void livestockRegistryService.overviewAnimals(id, renspaId, signal).then(rows => {
      if (!controller.signal.aborted) setOverview({ renspaId, rows, error: "" })
    }).catch(() => {
      if (!controller.signal.aborted) setOverview({ renspaId, rows: null,
        error: timeout.aborted ? "El resumen está tardando más de lo esperado." : "No pudimos cargar los rodeos." })
    })
    return () => controller.abort()
  }, [id, renspaId, hasGrowthOverview, overviewAttempt])
  function reloadOverview() {
    setOverview(null)
    retryOverview(value => value + 1)
  }
  const showAnimals = !!farm && isHacienda && !showOverview
  const pageKey = JSON.stringify([renspaId, search, page, pageRequest])
  const animalPage = loadedPage?.key === pageKey ? loadedPage.data : null
  useEffect(() => {
    if (!showAnimals) return
    setPageError("")
    const cached = pageCache.current.get(pageKey)
    if (cached && cached.expires > Date.now()) {
      setLoadedPage({ key: pageKey, data: cached.data })
      return
    }
    const controller = new AbortController()
    void livestockRegistryService.establishmentPage(id, renspaId, search, page, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return
        const lastPage = Math.max(1, Math.ceil(data.total / establishmentPageSize))
        if (page > lastPage) { setPage(lastPage); return }
        const cache = pageCache.current
        cache.delete(pageKey)
        cache.set(pageKey, { data, expires: Date.now() + 30_000 })
        if (cache.size > 6) {
          const first = cache.keys().next().value
          if (first !== undefined) cache.delete(first)
        }
        setLoadedPage({ key: pageKey, data })
      }).catch(cause => {
        if (!controller.signal.aborted) setPageError(cause?.message || "No pudimos cargar la hacienda.")
      })
    return () => controller.abort()
  }, [id, showAnimals, pageKey, renspaId, search, page])
  function change(patch: Record<string,string>) { const next = new URLSearchParams(params); Object.entries(patch).forEach(([key,value]) => value ? next.set(key,value) : next.delete(key)); setParams(next) }
  if (owner.loading) return <section className="page"><p role="status">Cargando establecimiento…</p></section>
  if (owner.error || !farm || !client) return <section className="page">
    <Link to="/clientes">Volver a clientes</Link>
    <LoadError message={owner.error || "No encontramos este establecimiento."} retry={owner.retry}/>
  </section>
  const farmUrl = (nextTab: string) => {
    const next = new URLSearchParams(params)
    next.delete("vista")
    next.set("tab", nextTab)
    return `?${next}`
  }
  const worksParams = new URLSearchParams({ tab: "trabajos" })
  if (renspaId) worksParams.set("renspa", renspaId)
  const isCaravanas = tab === "caravanas"
  const isData = tab === "datos"
  const renspaFilter = <AppSelect aria-label="Filtrar por RENSPA" value={renspaId} onChange={event => { setPage(1); change({ renspa: event.target.value }) }}>
    <option value="">Todos los RENSPA</option>
    {farm.renspas.map(row => <option key={row.id} value={row.id}>{row.number}</option>)}
  </AppSelect>
  return <section className={`page establishment-page compact-list-page${isHacienda ? " establishment-hacienda" : ""}`} aria-label={tabs.find(([key]) => key === tab)?.[1]}>
    {isHacienda && <div className="compact-list-heading"><PageHeader title={tab === "animales" ? "Animales" : "Hacienda"} actions={
      <Link className="primary-button" to={farmUrl("importar")}><Upload size={17}/>Importar archivos</Link>
    }/></div>}
    {isHacienda && (!showOverview || farm.renspas.length > 1 || renspaId) && <div className="hacienda-view-bar">
      <div className="hacienda-view-filters">
        {(farm.renspas.length > 1 || renspaId) && renspaFilter}
        {!showOverview && <label className="search"><input type="search" aria-label="Buscar animales del establecimiento" placeholder="Caravana o EID" value={query} onChange={event => setQuery(event.target.value)}/></label>}
      </div>
    </div>}
    {mountOverview && <div hidden={!showOverview}><OverviewBoundary key={`${renspaId}:${overviewAttempt}`} fallback={
      <div className="data-error" role="alert">No pudimos mostrar el resumen de Hacienda.
        <button className="secondary-button" type="button" onClick={reloadOverview}>Reintentar</button>
        <Link className="secondary-button" to={farmUrl("animales")}>Ver animales</Link>
      </div>
    }>
      <LivestockOverview farmId={id} renspaId={renspaId} profile={farm.livestockProfile} rows={currentOverview?.rows ?? null}
        animalsError={currentOverview?.error ?? ""} onRetryAnimals={reloadOverview}
        worksUrl={`?${worksParams}`}/>
    </OverviewBoundary></div>}
    {showAnimals && <>
      {pageError ? <LoadError message={pageError} retry={() => { setPageError(""); retryPage(value => value + 1) }}/>
        : !animalPage ? <p role="status">Cargando animales…</p>
        : <EstablishmentAnimalsTable farmName={farm.name} farmId={id} rows={animalPage.rows}
          total={animalPage.total} view={animalView} onViewChange={setAnimalView} onSelect={setSelected}/>}
      {animalPage && animalPage.total > establishmentPageSize && <nav className="animal-pagination" aria-label="Paginación de animales">
        <button className="secondary-button" type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
        <span>Página {page} de {Math.ceil(animalPage.total / establishmentPageSize)}</span>
        <button className="secondary-button" type="button" disabled={page * establishmentPageSize >= animalPage.total}
          onClick={() => setPage(value => value + 1)}>Siguiente</button>
      </nav>}
    </>}
    {tab === "sanidad" && <><div className="compact-list-heading"><PageHeader title="Sanidad"/></div>
      {(farm.renspas.length > 1 || renspaId) && <div className="toolbar compact-list-filters">{renspaFilter}</div>}
    </>}
    {(tab === "sanidad" || healthVisited) && <div hidden={tab !== "sanidad"} className="establishment-health-view">
      <CriaHealth key={`${id}:${renspaId}:${healthRevision}`} farmId={id} renspaId={renspaId} active={tab === "sanidad"}/>
    </div>}
    {tab === "trabajos" && <EstablishmentWorks key={`${id}:${renspaId}`} farm={farm} renspaId={renspaId}
      renspaFilter={farm.renspas.length > 1 || renspaId ? renspaFilter : null}/>}
    {tab === "importar" && <CsvImportPanel key={renspaId} pageTitle="Importar CSV" backTo={farmUrl("hacienda")}
      destination={{ clientId: client.id, farmId: id, renspaId }}
      destinationLabel={[farm.name, farm.renspas.find(row => row.id === renspaId)?.number].filter(Boolean).join(" · ")}
      onConfirmed={() => {
        pageCache.current.clear()
        setHealthRevision(value => value + 1)
        setLoadedPage(null)
        retryPage(value => value + 1)
        setOverview(null)
      }}/>}
    {isCaravanas && <EarTagsPage key={id} farmId={id} renspaId={renspaId} onRenspaChange={value => change({ renspa: value })}/>}
    {isData && <>
      <div className="compact-list-heading establishment-data-heading"><PageHeader title="Datos del establecimiento"/></div>
      {(farm.renspas.length > 1 || renspaId) && <div className="toolbar compact-list-filters">{renspaFilter}</div>}
      <div className="establishment-details">
      <section className="panel establishment-identity" aria-label="Información del establecimiento">
        <header className="establishment-identity-header">
          <h2>{farm.name}</h2>
          {profile?.role === "super_admin" && <Link className="secondary-button"
            to={`/clientes?${new URLSearchParams({ cliente: client.id, campo: id, accion: "editar", renspa: renspaId })}`}>Editar ficha del cliente</Link>}
        </header>
        <dl>
          <div><dt>Cliente</dt><dd>{client.legalName}</dd></div>
          <div><dt>Ubicación</dt><dd>{[farm.address, farm.locality, farm.province].filter(Boolean).join(" · ") || "Sin completar"}</dd></div>
        </dl>
      </section>
      <LivestockProfilePanel key={id} farmId={id} profile={farm.livestockProfile} canEdit={profile?.role === "super_admin"}
        onSaved={livestockProfile => owner.setData(previous => previous && ({
          ...previous,
          farms: previous.farms.map(item => item.id === id ? { ...item, livestockProfile } : item),
        }))}/>
      <section className="panel establishment-data-panel" aria-label="Registros sanitarios">
        <header className="establishment-registry-header">
          <h2>RENSPA</h2>
          {profile?.role === "super_admin" && <Link className="secondary-button"
            to={`/clientes?${new URLSearchParams({ cliente: client.id, campo: id, accion: "renspa", renspa: renspaId })}`}>Agregar RENSPA</Link>}
        </header>
        <div className="table-wrap"><table className="data-table" aria-label="RENSPA del establecimiento">
          <thead><tr><th scope="col">RENSPA</th><th scope="col">CUIG</th><th scope="col">CV</th></tr></thead>
          <tbody>{farm.renspas.filter(row => !renspaId || row.id === renspaId).map(row =>
            <tr key={row.id}><td>{row.number}</td><td>{row.cuig || "—"}</td><td>{row.cv || "—"}</td></tr>)}
            {!farm.renspas.some(row => !renspaId || row.id === renspaId) && <tr><td colSpan={3}>No hay RENSPA para mostrar.</td></tr>}
          </tbody>
        </table></div>
      </section>
      </div>
    </>}
    {selected && <AnimalDetail animal={selected} onClose={() => setSelected(null)}/>}
  </section>
}

function EstablishmentWorks({ farm, renspaId, renspaFilter }: {
  farm: ClientRecord["farms"][number]; renspaId: string; renspaFilter: ReactNode
}) {
  const { profile } = useAuth()
  const canRegister = profile?.role === "super_admin"
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [sessionError, setSessionError] = useState("")
  const [sessionRetry, retrySessions] = useState(0)
  const [workPage, setWorkPage] = useState(1)
  const [workLinks, setWorkLinks] = useState<{ key: string; data: Map<string, WorkLinks> } | null>(null)
  const [linkError, setLinkError] = useState("")
  const [linkRetry, retryLinks] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setSessionError("")
    void loadSessions(farm.id, renspaId, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]))
      .then(rows => { if (!controller.signal.aborted) setSessions(rows) })
      .catch(() => { if (!controller.signal.aborted) setSessionError("No pudimos cargar las jornadas.") })
    return () => controller.abort()
  }, [farm.id, renspaId, sessionRetry])

  const [manual, setManual] = useState<Awaited<ReturnType<typeof professionalWorksService.list>>>([])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<(typeof manual)[number] | null>(null)
  const [loading, setLoading] = useState(canRegister)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  const [sessionEdit, setSessionEdit] = useState<{ session: Session; type: CsvSessionType | "" } | null>(null)
  const [classifying, setClassifying] = useState(false)
  const [classificationError, setClassificationError] = useState("")
  const typeDialog = useRef<HTMLDialogElement>(null)
  const editingType = sessionEdit !== null
  useEffect(() => {
    if (!editingType) return
    const dialog = typeDialog.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [editingType])
  function editSessionType(session: Session) {
    const type = session.session_type.toLowerCase()
    setClassificationError("")
    setSessionEdit({ session, type: isCsvSessionType(type) ? type : "" })
  }
  async function saveSessionType() {
    if (!sessionEdit?.type || classifying) return
    setClassifying(true)
    setClassificationError("")
    const { session, type } = sessionEdit
    try {
      await correctGallagherSessionType(farm.id, session.id, session.session_type, type)
      setSessions(previous => previous?.map(row => row.id === session.id ? { ...row, session_type: type } : row) ?? null)
      setSessionEdit(null)
    } catch (cause) {
      setClassificationError(cause instanceof Error ? cause.message : "No se pudo cambiar el tipo de jornada.")
    } finally {
      setClassifying(false)
    }
  }
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
    ...(sessions ?? []).map(row => ({
      id: `session:${row.id}`,
      title: row.source === "gallagher" ? gallagherSessionTitle(row.title, row.session_type) : row.title,
      date: row.session_date,
      session: row.source === "gallagher" && row.status === "confirmada" && row.session_type !== "sanidad" ? row : null,
      dateLabel: row.source === "gallagher"
        ? row.session_date.slice(0, 10).split("-").reverse().join("/")
        : new Date(row.session_date).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
      source: row.source === "gallagher" ? "Gallagher" : row.source,
      status: row.status, sessionId: row.id,
      editable: null,
    })),
    ...(canRegister ? manual : []).map(row => ({
      id: `work:${row.id}`, title: row.description, date: row.work_date, dateLabel: row.work_date.split("-").reverse().join("/"),
      source: "Manual", session: null, status: "registrado", sessionId: null, editable: row.invoiced ? null : row,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))

  const pages = Math.max(1, Math.ceil(rows.length / establishmentPageSize))
  const currentPage = Math.min(workPage, pages)
  const firstRow = (currentPage - 1) * establishmentPageSize
  const pageRows = rows.slice(firstRow, firstRow + establishmentPageSize)
  const linkCache = useRef(new Map<string, Map<string, WorkLinks>>())
  const idsKey = loading ? "" : pageRows.flatMap(row => row.sessionId ? [row.sessionId] : []).join(",")
  useEffect(() => {
    if (!idsKey) return
    const controller = new AbortController()
    setLinkError("")
    const cached = linkCache.current.get(idsKey)
    if (cached) {
      setWorkLinks({ key: idsKey, data: cached })
      return
    }
    void loadWorkLinks(farm.id, idsKey.split(","), AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]))
      .then(data => {
        if (controller.signal.aborted) return
        linkCache.current.set(idsKey, data)
        setWorkLinks({ key: idsKey, data })
      })
      .catch(() => { if (!controller.signal.aborted) setLinkError("No pudimos cargar los vínculos de esta página.") })
    return () => controller.abort()
  }, [farm.id, idsKey, linkRetry])

  function linkedDetails(sessionId: string | null) {
    const item = sessionId && workLinks?.key === idsKey ? workLinks.data.get(sessionId) : null
    return {
      renspa: item ? item.renspaIds.map(id => farm.renspas.find(row => row.id === id)?.number).filter(Boolean).join(", ") || "—" : "—",
      animals: item?.animals || "—",
    }
  }

  function rowAction(row: typeof rows[number]) {
    if (!canRegister) return null
    if (row.editable) return <button type="button" className="table-action" onClick={() => setEditing(row.editable)}>Editar</button>
    const session = row.session
    return session && <button type="button" className="table-action"
      onClick={() => editSessionType(session)}>Cambiar tipo</button>
  }

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
    {!sessions && !sessionError && <p role="status">Cargando jornadas…</p>}
    {sessionError && <LoadError message={sessionError} retry={() => retrySessions(value => value + 1)}/>}
    {idsKey && workLinks?.key !== idsKey && !linkError && <p role="status">Cargando vínculos de esta página…</p>}
    {idsKey && linkError && <LoadError message={linkError} retry={() => retryLinks(value => value + 1)}/>}
    {sessions && <>
    <div className="panel data-panel establishment-works-table"><div className="table-wrap">
      <table className="data-table" aria-label="Trabajos realizados">
        <thead><tr><th scope="col">Fecha</th><th scope="col">Trabajo</th><th scope="col">RENSPA</th>
          <th scope="col">Animales vinculados</th><th scope="col">Origen</th><th scope="col">Estado</th>{canRegister && <th scope="col">Acción</th>}</tr></thead>
        <tbody>{pageRows.map(row => <tr key={row.id}><td>{row.dateLabel}</td><td>{row.title}</td><td>{linkedDetails(row.sessionId).renspa}</td>
          <td>{linkedDetails(row.sessionId).animals}</td><td>{row.source}</td><td>{badge(row.status)}</td>
          {canRegister && <td>{rowAction(row)}</td>}</tr>)}
          {!rows.length && <tr><td colSpan={canRegister ? 7 : 6}>No hay trabajos para mostrar.</td></tr>}
        </tbody>
      </table>
    </div></div>
    <ul className="establishment-works-list" aria-label="Trabajos realizados">
      {pageRows.map(row => {
        const details = linkedDetails(row.sessionId)
        return <li className="panel" key={row.id}>
        <div>{row.dateLabel} · {row.source}{badge(row.status)}</div>
        <strong>{row.title}</strong>
        {details.renspa !== "—" && <p>RENSPA {details.renspa}</p>}
        {details.animals !== "—" && <p>{details.animals} animales vinculados</p>}
        {rowAction(row)}
      </li>
      })}
      {!rows.length && <li className="panel">No hay trabajos para mostrar.</li>}
    </ul>
    {pages > 1 && <nav className="animal-pagination" aria-label="Paginación de trabajos">
      <button type="button" className="secondary-button" disabled={currentPage === 1} onClick={() => setWorkPage(currentPage - 1)}>Anterior</button>
      <span>Página {currentPage} de {pages} · {firstRow + 1}–{firstRow + pageRows.length} de {rows.length}</span>
      <button type="button" className="secondary-button" disabled={currentPage === pages} onClick={() => setWorkPage(currentPage + 1)}>Siguiente</button>
    </nav>}
    </>}
    {sessionEdit && <dialog className="dialog-card compact-dialog" ref={typeDialog} aria-labelledby="gallagher-type-title"
      onCancel={event => { event.preventDefault(); if (!classifying) setSessionEdit(null) }}>
      <form onSubmit={event => { event.preventDefault(); void saveSessionType() }}>
        <h2 id="gallagher-type-title">Cambiar tipo de jornada</h2>
        <p>{gallagherSessionTitle(sessionEdit.session.title, sessionEdit.session.session_type)}</p>
        <label className="form-field">Tipo de jornada
          <AppSelect required disabled={classifying} value={sessionEdit.type} onChange={event => {
            const type = event.target.value
            if (isCsvSessionType(type)) setSessionEdit({ ...sessionEdit, type })
          }}>
            <option value="">Elegir tipo</option>
            {(["otro", "tacto", "raspaje_toros"] as const).map(value => <option key={value} value={value}>{csvSessionTypes[value]}</option>)}
          </AppSelect>
        </label>
        {classificationError && <p className="form-error" role="alert">{classificationError}</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" disabled={classifying} onClick={() => setSessionEdit(null)}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={classifying || !sessionEdit.type
            || sessionEdit.type === sessionEdit.session.session_type.toLowerCase()}>{classifying ? "Guardando…" : "Guardar cambio"}</button>
        </div>
      </form>
    </dialog>}
    {canRegister && (creating || editing) && <WorkDialog key={editing?.id ?? "new"} fixedFarm={farm} editing={editing ?? undefined}
      onClose={() => { setCreating(false); setEditing(null) }} onSaved={() => {
      setCreating(false); setEditing(null)
      setRevision(value => value + 1)
    }}/>}
  </div>
}
