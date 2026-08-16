import { useEffect, useMemo, useState } from "react"
import { Beef, MapPin, Plus, Search, Sprout, Tractor } from "lucide-react"
import { agroService, type FarmListItem } from "@/services/agro.service"
import { Link } from "react-router-dom"

const hectares = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 })

export function FarmsPage() {
  const [farms, setFarms] = useState<FarmListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [mode, setMode] = useState("todos")
  const load = () => agroService.listFarms().then(setFarms).catch(cause => setError(cause instanceof Error ? cause.message : "No pudimos cargar los campos.")).finally(() => setLoading(false))
  useEffect(() => { void load() }, [])
  const visible = useMemo(() => farms.filter(farm => (mode === "todos" || farm.serviceMode === mode) && `${farm.name} ${farm.clientName} ${farm.locality}`.toLowerCase().includes(query.toLowerCase())), [farms, mode, query])
  const totalArea = farms.reduce((sum, farm) => sum + farm.totalHectares, 0)
  if (error) return <section className="page"><div className="data-error"><strong>No pudimos cargar los campos</strong><span>{error}</span></div></section>
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">ESTRUCTURA PRODUCTIVA</span><h1>Campos y lotes</h1><p>Cada establecimiento conserva su producción y administración por separado.</p></div><Link className="secondary-button" to="/configuracion"><Plus size={18}/> Administrar campos</Link></div>
    <div className="summary-line"><strong>{farms.length} campos activos</strong><span>{hectares.format(totalArea)} hectáreas administradas</span></div>
    <div className="toolbar"><div className="search"><Search size={18}/><input aria-label="Buscar campos" placeholder="Buscar por campo, cliente o localidad" value={query} onChange={event => setQuery(event.target.value)}/></div><select aria-label="Filtrar tipo de servicio" value={mode} onChange={event => setMode(event.target.value)}><option value="todos">Todos los servicios</option><option value="administracion_integral">Administración integral</option><option value="veterinaria">Servicio veterinario</option></select></div>
    {loading ? <div className="loading-panel">Cargando establecimientos…</div> : visible.length ? <div className="farm-grid">{visible.map(farm => <article className="farm-card" key={farm.id}><div className="farm-card-top"><div className="farm-icon"><Tractor/></div><span className={`service-badge ${farm.serviceMode}`}>{farm.serviceMode === "administracion_integral" ? "Administración integral" : "Servicio veterinario"}</span></div><h2>{farm.name}</h2><p className="client-name">{farm.clientName}</p><span className="location"><MapPin size={14}/>{farm.locality}, Buenos Aires</span><div className="farm-stats"><div><Sprout size={17}/><span><strong>{hectares.format(farm.totalHectares)} ha</strong>{farm.lotCount} lotes</span></div><div><Beef size={17}/><span><strong>{farm.herdCount} tropas</strong>{farm.animalCount} caravanas</span></div></div><Link className="card-link" to={`/campos/${farm.id}`}>Ver establecimiento →</Link></article>)}</div> : <article className="panel empty-farms"><div className="empty-icon large"><Tractor/></div><h2>No encontramos campos</h2><p>Probá con otra búsqueda o tipo de servicio.</p></article>}
  </section>
}
