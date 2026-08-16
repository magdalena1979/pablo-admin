import { useEffect, useState } from "react"
import { Activity, ArrowLeft, Beef, ClipboardList, MapPin, Sprout, Stethoscope, Wallet } from "lucide-react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { agroService, type FarmDetail, type LivestockOverview } from "@/services/agro.service"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"

const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" })
const tabs = [["resumen","Resumen"],["lotes","Lotes"],["hacienda","Hacienda"],["sanidad","Sanidad"],["administracion","Administración"],["tareas","Tareas"]] as const
type TabId = typeof tabs[number][0]

export function FarmDetailPage() {
  const { id="" }=useParams(); const [params,setParams]=useSearchParams(); const tab=(params.get("tab")||"resumen") as TabId
  const {selectFarm}=useFarmScope(); const [farm,setFarm]=useState<FarmDetail|null>(null); const [livestock,setLivestock]=useState<LivestockOverview|null>(null); const [error,setError]=useState<string|null>(null)
  useEffect(()=>{void Promise.all([agroService.getFarm(id),agroService.getLivestockOverview(id)]).then(([f,l])=>{setFarm(f);setLivestock(l);selectFarm(id)}).catch(c=>setError(c instanceof Error?c.message:"No pudimos cargar el campo."))},[id])
  if(error)return <section className="page"><div className="data-error"><strong>No pudimos abrir el establecimiento</strong><span>{error}</span></div></section>
  if(!farm||!livestock)return <section className="page"><div className="loading-panel">Cargando establecimiento…</div></section>
  return <section className="page farm-workspace"><Link className="back-link" to="/campos"><ArrowLeft size={16}/> Volver a campos</Link><div className="farm-hero"><div><span className="eyebrow">{farm.serviceMode==="administracion_integral"?"ADMINISTRACIÓN INTEGRAL":"SERVICIO VETERINARIO"}</span><h1>{farm.name}</h1><p>{farm.clientName}</p></div><div className="farm-hero-meta"><span><MapPin size={15}/>{farm.locality}, Buenos Aires</span><span>Campaña 2026/27</span></div></div>
    <nav className="workspace-tabs">{tabs.map(([value,label])=><button key={value} className={tab===value?"active":""} onClick={()=>setParams({tab:value},{replace:true})}>{label}</button>)}</nav>
    {tab==="resumen"&&<><div className="detail-summary"><div><Sprout/><span><strong>{number.format(farm.totalHectares)} ha</strong>{farm.lotCount} lotes productivos</span></div><div><Beef/><span><strong>{farm.herdCount} tropas</strong>{farm.animalCount} caravanas individuales</span></div><div><Activity/><span><strong>{livestock.movements.length} movimientos</strong>Campaña en curso</span></div></div><div className="workspace-grid"><article className="panel"><Heading kicker="DISTRIBUCIÓN" title="Uso de la superficie"/><div className="use-list">{farm.lots.slice(0,6).map(lot=><div key={lot.id}><span><strong>{lot.name}</strong><small>{lot.currentUse}</small></span><b>{number.format(lot.hectares)} ha</b></div>)}</div></article><article className="panel"><Heading kicker="ACTIVIDAD" title="Últimos movimientos"/><ActivityList items={livestock.movements.slice(0,5)}/></article></div></>}
    {tab==="lotes"&&<article className="panel data-panel"><div className="list-heading padded"><Heading kicker="SUPERFICIE PRODUCTIVA" title="Lotes y uso actual"/></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Lote</th><th>Superficie</th><th>Uso actual</th><th>Participación</th></tr></thead><tbody>{farm.lots.map(lot=><tr key={lot.id}><td><strong>{lot.name}</strong></td><td>{number.format(lot.hectares)} ha</td><td>{lot.currentUse}</td><td>{number.format(lot.hectares/farm.totalHectares*100)}%</td></tr>)}</tbody></table></div></article>}
    {tab==="hacienda"&&<div className="workspace-grid"><article className="panel data-panel"><div className="list-heading padded"><Heading kicker="EXISTENCIAS" title="Tropas activas"/></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Tropa</th><th>Lote</th><th>Categoría</th><th>Caravanas</th></tr></thead><tbody>{livestock.herds.map(herd=><tr key={herd.id}><td><strong>{herd.name}</strong></td><td>{herd.lotName}</td><td><span className="badge">{herd.categoryName}</span></td><td>{herd.trackedAnimals}</td></tr>)}</tbody></table></div></article><article className="panel"><Heading kicker="CAMPAÑA" title="Movimientos recientes"/><ActivityList items={livestock.movements}/></article></div>}
    {tab==="sanidad"&&<article className="panel workspace-empty"><div className="empty-icon large"><Stethoscope/></div><h2>Sanidad de {farm.name}</h2><p>Vacunaciones, tratamientos, tactos, partos y alertas del establecimiento.</p><Link className="primary-button" to="/sanidad">Abrir agenda sanitaria</Link></article>} 
    {tab==="administracion"&&<article className="panel workspace-empty"><div className="empty-icon large"><Wallet/></div><h2>Administración de {farm.name}</h2><p>Gastos, caja chica y aprobaciones exclusivos del establecimiento.</p><Link className="primary-button" to="/administracion">Abrir administración</Link></article>} 
    {tab==="tareas"&&<WorkspaceEmpty icon={ClipboardList} title="Tareas del campo" text={`Plan de trabajo, responsables y vencimientos operativos de ${farm.name}.`}/>} 
  </section>
}

function Heading({kicker,title}:{kicker:string;title:string}){return <><span className="eyebrow">{kicker}</span><h2>{title}</h2></>}
function ActivityList({items}:{items:LivestockOverview["movements"]}){return <div className="compact-activity">{items.map(item=><div key={item.id}><span className={`movement-dot ${item.operation}`}/><span><strong>{item.operation.replaceAll("_"," ")}</strong><small>{date.format(new Date(`${item.occurredOn}T12:00:00`))}</small></span><b>{item.animalCount} cab.</b></div>)}</div>}
function WorkspaceEmpty({icon:Icon,title,text}:{icon:typeof Stethoscope;title:string;text:string}){return <article className="panel workspace-empty"><div className="empty-icon large"><Icon/></div><h2>{title}</h2><p>{text}</p><span>La estructura está lista para incorporar registros en la próxima iteración.</span></article>}
