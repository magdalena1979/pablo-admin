import { useEffect, useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, Tag, FileUp, UserRoundPlus, ArrowRight } from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"
import { clientsService, type ClientRecord } from "@/services/clients.service"
import "./action-home.css"

export function ActionHomePage(){
 const {profile}=useAuth()
 const [clients,setClients]=useState<ClientRecord[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("")
 const [retry,setRetry]=useState(0)
 const canManage=profile?.role==="super_admin"
 useEffect(()=>{let active=true;setLoading(true);setError("");void clientsService.list().then(rows=>{if(active)setClients(rows)}).catch(cause=>{if(active)setError(cause?.message||"No pudimos cargar tus establecimientos.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[retry])
 const farms=clients.flatMap(client=>client.farms.map(farm=>({...farm,client:client.legalName,color:client.color||"#2D6AA3"})))
 return <section className="page action-home" aria-label="Inicio">
 <div className="home-actions">
 {canManage&&<Link className="home-action" to="/caravanas"><div className="home-action-top"><span className="home-action-icon"><Tag size={24}/></span><ArrowUpRight size={18}/></div><h2>Caravanas</h2></Link>}
 <Link className="home-action home-import-action" to="/hacienda"><div className="home-action-top"><span className="home-action-icon"><FileUp size={24} aria-hidden="true"/></span><ArrowUpRight className="home-action-arrow" size={18} aria-hidden="true"/></div><h2>Importar CSV</h2></Link>
 {canManage&&<Link className="home-action" to="/clientes?nuevo=1"><div className="home-action-top"><span className="home-action-icon"><UserRoundPlus size={24}/></span><ArrowUpRight size={18}/></div><h2>Agregar cliente</h2></Link>}
 </div>
 <section className="home-farms" aria-label="Mis establecimientos">
 {loading?<p role="status">Cargando establecimientos…</p>:error?<div className="data-error" role="alert">{error}<button className="secondary-button" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></div>:farms.length?<div className="home-farm-grid">{farms.map(farm=><Link key={farm.id} className="home-farm" to={`/establecimientos/${farm.id}`} style={{"--client-accent":farm.color} as CSSProperties}><div className="home-farm-client"><i/>{farm.client}</div><div className="home-farm-name"><h3>{farm.name}</h3><ArrowRight size={18}/></div><p>{[farm.locality,farm.province].filter(Boolean).join(" · ")||"Ubicación sin completar"}</p><small>{farm.renspas.length} RENSPA</small></Link>)}</div>:<div className="home-farm-empty"><h3>Todavía no hay establecimientos</h3><p>Ingresá a un cliente para agregar su primer establecimiento.</p><Link className="secondary-button" to="/clientes">Ir a clientes</Link></div>}
 </section></section>
}
