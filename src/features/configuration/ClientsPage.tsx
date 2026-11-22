import { AppSelect } from "@/components/ui/AppSelect"
import { PageHeader } from "@/components/ui/Presentation"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, ChevronRight, Plus, Search, X } from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"
import { clientsService, type ClientRecord, type FarmInput } from "@/services/clients.service"
import { Link, useSearchParams } from "react-router-dom"
import { ClientsGrid } from "./ClientsGrid"
import "./client-registration.css"

const fields = [ ["legalName", "Razón social", "text"], ["taxId", "CUIT", "text"], ["address", "Domicilio", "text"], ["responsible", "Responsable", "text"], ["phone", "Teléfono", "tel"], ["email", "Mail", "email"] ] as const
const emptyClient = { color: "#2D6AA3", legalName: "", taxId: "", address: "", responsible: "", phone: "", email: "" }
const emptyFarm: FarmInput = { name: "", address: "", locality: "", province: "", serviceMode: "" }
const emptyRenspa = { number: "", cuig: "", cv: "" }
export function ClientsPage() {
  const { profile } = useAuth()
  const { refresh } = useFarmScope()
  const canManage = profile?.role === "super_admin"
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [params, setParams] = useSearchParams()
  const selectedId = params.get("cliente")
  function setSelectedId(id: string | null) { setParams(id ? { cliente: id } : {}) }
  const [query, setQuery] = useState("")
  const [clientDraft, setClientDraft] = useState<typeof emptyClient | null>(null)
  const [editing, setEditing] = useState(false)
  const [farmDraft, setFarmDraft] = useState<typeof emptyFarm | null>(null)
  const [renspaFarmId, setRenspaFarmId] = useState<string | null>(null)
  const [renspaDraft, setRenspaDraft] = useState(emptyRenspa)
  useEffect(()=>{if(canManage && params.get("nuevo")==="1"){setEditing(false);setSaveError("");setClientDraft({...emptyClient});const next=new URLSearchParams(params);next.delete("nuevo");setParams(next,{replace:true})}},[canManage,params,setParams])
  const selected = clients.find(client => client.id === selectedId)
  const visible = clients.filter(client => [client.legalName, client.taxId, client.address, client.responsible, client.phone, client.email,
    ...client.farms.flatMap(farm => [farm.name, farm.address, farm.locality, farm.province, ...farm.renspas.flatMap(row => [row.number, row.cuig, row.cv])])
  ].join(" ").toLocaleLowerCase("es-AR").includes(query.trim().toLocaleLowerCase("es-AR")))
  async function load() {
    setLoading(true); setLoadError("")
    try { setClients(await clientsService.list()) }
    catch (cause) { setLoadError(errorMessage(cause)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  async function save(action: () => Promise<void>) {
    if (savingRef.current) return
    savingRef.current = true; setSaving(true); setSaveError("")
    try { await action(); await load() }
    catch (cause) { setSaveError(errorMessage(cause)) }
    finally { savingRef.current = false; setSaving(false) }
  }
  function closeDialogs() { if (savingRef.current) return; setClientDraft(null); setFarmDraft(null); setRenspaFarmId(null); setSaveError("") }
  if (loading && !clients.length) return <section className="page compact-list-page"><div className="loading-panel">Cargando clientes…</div></section>
  return <section className="page compact-list-page"><div className={selected ? "registration" : "registration clients-list"}>
    {loadError && <div className="data-error" role="alert"><strong>No pudimos cargar los clientes</strong><span>{loadError}</span><button className="secondary-button" onClick={() => void load()}>Reintentar</button></div>}
    {selected ? <>
      <div className="compact-list-heading clients-compact-heading">
        <button type="button" className="text-button compact-back" aria-label="Volver a Clientes" onClick={() => setSelectedId(null)}><ArrowLeft size={20} aria-hidden="true"/></button>
        <PageHeader title={selected.legalName || "Cliente sin completar"} actions={canManage && <button type="button" className="secondary-button" onClick={() => { setSaveError(""); setEditing(true); setClientDraft({ ...selected, color: selected.color || "#2D6AA3" }) }}>Editar ficha</button>}/>
      </div>
      <article className="panel"><dl className="client-details">{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{selected[key] || "Sin completar"}</dd></div>)}</dl></article>
      <div className="page-heading registration-section-heading"><div><span className="eyebrow">ESTABLECIMIENTOS DEL CLIENTE</span><h2>Establecimientos</h2></div>{canManage && <button className="primary-button" onClick={() => { setSaveError(""); setFarmDraft({ ...emptyFarm }) }}><Plus size={17}/>Agregar establecimiento</button>}</div>
      {!selected.farms.length && <article className="panel empty-farms"><h2>Sin establecimientos</h2><p>Agregá un establecimiento y luego sus RENSPA.</p></article>}
      {selected.farms.map(farm => <article className="panel client-farm-card" key={farm.id}>
        <div className="form-section-title"><div><h2><Link to={`/establecimientos/${farm.id}`}>{farm.name || "Establecimiento sin completar"} →</Link></h2><span>{[farm.address, farm.locality, farm.province].filter(Boolean).join(" · ") || "Ubicación sin completar"}</span></div>{canManage && <button className="secondary-button" onClick={() => { setSaveError(""); setRenspaFarmId(farm.id); setRenspaDraft({ ...emptyRenspa }) }}><Plus size={16}/>Agregar RENSPA</button>}</div>
        {farm.renspas.length ? <div className="table-wrap"><table className="data-table"><caption className="client-table-caption">RENSPA de {farm.name || "este establecimiento"}</caption><thead><tr><th>RENSPA</th><th>CUIG</th><th>CV</th></tr></thead><tbody>{farm.renspas.map(row => <tr key={row.id}><td>{row.number || "Sin completar"}</td><td>{row.cuig || "Sin completar"}</td><td>{row.cv || "Sin completar"}</td></tr>)}</tbody></table></div> : <p className="client-empty-note">Este establecimiento todavía no tiene RENSPA.</p>}
      </article>)}
    </> : <>
      <div className="compact-list-heading clients-compact-heading">
        <Link to="/inicio" className="text-button compact-back" aria-label="Volver a Inicio"><ArrowLeft size={20} aria-hidden="true"/></Link>
        <PageHeader title="Mis clientes" actions={canManage && <button type="button" className="primary-button" aria-label="Nuevo cliente" title="Nuevo cliente" onClick={() => { setSaveError(""); setEditing(false); setClientDraft({ ...emptyClient }) }}><Plus size={20} aria-hidden="true"/></button>}/>
      </div>
      <div className="toolbar compact-list-search">
        <label className="search"><Search size={16} aria-hidden="true"/><input type="search" aria-label="Buscar por cliente, contacto, establecimiento o RENSPA" placeholder="Buscar clientes" value={query} onChange={e => setQuery(e.target.value)}/></label>
      </div>
      <div className="clients-desktop-grid"><ClientsGrid clients={visible} onOpen={setSelectedId}
        emptyMessage={clients.length ? "No hay clientes para esta búsqueda." : "Todavía no hay clientes registrados."}/></div>
      <ul className="panel clients-mobile-list" aria-label="Clientes">
        {visible.map(client => <li key={client.id}>
          <button type="button" onClick={() => setSelectedId(client.id)}>
            <span>
              <strong>{client.legalName || "Cliente sin completar"}</strong>
              {client.farms.length > 0 && <small>{client.farms.map(farm => farm.name).filter(Boolean).join(" · ")}</small>}
            </span>
            <ChevronRight size={17} aria-hidden="true"/>
          </button>
        </li>)}
        {!visible.length && <li className="clients-mobile-empty">{clients.length ? "No hay clientes para esta búsqueda." : "Todavía no hay clientes registrados."}</li>}
      </ul>
    </>}
    {clientDraft && <RegistrationDialog title={editing ? "Editar ficha del cliente" : "Nuevo cliente"} onClose={closeDialogs}><form onSubmit={event => {
      event.preventDefault()
      void save(async () => {
        const id = await clientsService.saveClient(clientDraft, editing ? selectedId ?? undefined : undefined)
        setSelectedId(id); setClientDraft(null); void refresh().catch(() => undefined)
      })
    }}><fieldset className="registration-inputs" disabled={saving}><div className="form-grid"><label>Color del cliente<input type="color" value={clientDraft.color} onChange={event=>setClientDraft({...clientDraft,color:event.target.value})}/></label>{fields.map(([key, label, type]) => <label key={key}>{label}<input required={key === "legalName"} autoFocus={key === "legalName"} type={type} value={clientDraft[key]} onChange={event => setClientDraft({ ...clientDraft, [key]: event.target.value })}/></label>)}</div></fieldset><RegistrationActions saving={saving} error={saveError} onClose={closeDialogs} label="Guardar cliente"/></form></RegistrationDialog>}
    {farmDraft && selected && <RegistrationDialog title="Agregar establecimiento" onClose={closeDialogs}><p>Cliente: <strong>{selected.legalName}</strong></p><form onSubmit={event => {
      event.preventDefault()
      void save(async () => {
        await clientsService.addFarm(selected.id, farmDraft)
        setFarmDraft(null)
        // Refresh scope independently: a scope load failure must not offer to reinsert a saved farm.
        void refresh().catch(() => undefined)
      })
    }}><fieldset className="registration-inputs" disabled={saving}><div className="form-grid">{([["name", "Nombre del establecimiento"], ["address", "Domicilio / ubicación"], ["locality", "Localidad"], ["province", "Provincia"]] as const).map(([key, label]) => <label key={key}>{label}<input required={key === "name"} autoFocus={key === "name"} value={farmDraft[key]} onChange={event => setFarmDraft({ ...farmDraft, [key]: event.target.value })}/></label>)}<label>Modalidad de servicio<AppSelect required value={farmDraft.serviceMode} onChange={event => setFarmDraft({ ...farmDraft, serviceMode: event.target.value as FarmInput["serviceMode"] })}><option value="">Seleccionar modalidad</option><option value="veterinaria">Servicio veterinario</option><option value="administracion_integral">Administración integral</option></AppSelect></label></div></fieldset><RegistrationActions saving={saving} error={saveError} onClose={closeDialogs} label="Guardar establecimiento"/></form></RegistrationDialog>}
    {renspaFarmId && selected && <RegistrationDialog title="Agregar RENSPA" onClose={closeDialogs}><p>Establecimiento: <strong>{selected.farms.find(farm => farm.id === renspaFarmId)?.name}</strong></p><form onSubmit={event => {
      event.preventDefault()
      void save(async () => { await clientsService.addRenspa(renspaFarmId, renspaDraft); setRenspaFarmId(null) })
    }}><fieldset className="registration-inputs" disabled={saving}><div className="form-grid">{([["number", "RENSPA"], ["cuig", "CUIG"], ["cv", "CV"]] as const).map(([key, label]) => <label key={key}>{label}<input required={key === "number"} autoFocus={key === "number"} value={renspaDraft[key]} placeholder={key === "number" ? "00.000.0.00000/00" : undefined} onChange={event => setRenspaDraft({ ...renspaDraft, [key]: event.target.value })}/></label>)}</div></fieldset><RegistrationActions saving={saving} error={saveError} onClose={closeDialogs} label="Guardar RENSPA"/></form></RegistrationDialog>}
  </div></section>
}

function RegistrationDialog({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  return <div className="dialog-backdrop"><section className="dialog-card" role="dialog" aria-modal="true" aria-label={title} onKeyDown={event => { if (event.key === "Escape") onClose() }}><div className="dialog-header"><div><span className="eyebrow">CLIENTES Y ESTABLECIMIENTOS</span><h2>{title}</h2></div><button type="button" className="icon-button" aria-label="Cerrar formulario" onClick={onClose}><X/></button></div>{children}</section></div>
}
function RegistrationActions({ onClose, label, saving, error }: { onClose(): void; label: string; saving: boolean; error: string }) {
  return <>{error && <div className="form-error" role="alert">{error}</div>}<div className="dialog-actions"><button type="button" className="secondary-button" disabled={saving} onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Guardando…" : label}</button></div></>
}
function errorMessage(cause: unknown): string {
  if (cause && typeof cause === "object" && "code" in cause && cause.code === "42501") return "No tenés permiso para realizar esta acción."
  if (cause && typeof cause === "object" && "code" in cause && cause.code === "23505") return "Ya existe un registro con esos datos."
  return cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "No pudimos completar la operación. Intentá nuevamente."
}
