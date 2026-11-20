import { PageHeader } from "@/components/ui/Presentation"
import { useEffect, useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, Tag, FileUp, MapPin, UserRoundPlus, Search, ArrowRight } from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"
import { clientsService, type ClientRecord } from "@/services/clients.service"
import "./action-home.css"

export function ActionHomePage(){
 const {profile}=useAuth()
 const [clients,setClients]=useState<ClientRecord[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("")
 const [query,setQuery]=useState(""),[retry,setRetry]=useState(0)
 const canManage=profile?.role==="super_admin"
 useEffect(()=>{let active=true;setLoading(true);setError("");void clientsService.list().then(rows=>{if(active)setClients(rows)}).catch(cause=>{if(active)setError(cause?.message||"No pudimos cargar tus establecimientos.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[retry])
 const farms=clients.flatMap(client=>client.farms.map(farm=>({...farm,client:client.legalName,color:client.color||"#2D6AA3"})))
 const visible=farms.filter(farm=>[farm.name,farm.client,farm.locality,...farm.renspas.map(row=>row.number)].join(" ").toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")))
 return <section className="page action-home">
 <PageHeader eyebrow="ADMINISTRACIÓN GENERAL" title="¿Qué querés hacer?" description="Elegí una tarea o entrá directamente a un establecimiento."/>
 <div className="home-actions">
 {canManage&&<Link className="home-action home-action-primary" to="/caravanas?nueva=1"><div className="home-action-top"><span className="home-action-icon"><Tag size={24}/></span><ArrowUpRight size={18}/></div><h2>Registrar caravanas</h2><p>Cargá la numeración y el sexo para un campo y RENSPA.</p><span className="home-action-cta">Nueva recepción <ArrowRight size={16}/></span></Link>}
 <Link className="home-action" to="/hacienda"><div className="home-action-top"><span className="home-action-icon"><FileUp size={24}/></span><ArrowUpRight size={18}/></div><h2>Importar trabajo</h2><p>Subí los CSV de Gallagher y revisá qué se va a guardar.</p><span className="home-action-cta">Sesiones de Gallagher <ArrowRight size={16}/></span></Link>
 <a className="home-action" href="#mis-establecimientos"><div className="home-action-top"><span className="home-action-icon"><MapPin size={24}/></span><ArrowUpRight size={18}/></div><h2>Consultar un campo</h2><p>Buscá animales, recorré su historial y consultá los trabajos.</p><span className="home-action-cta">Ver establecimientos <ArrowRight size={16}/></span></a>
 {canManage&&<Link className="home-action" to="/clientes?nuevo=1"><div className="home-action-top"><span className="home-action-icon"><UserRoundPlus size={24}/></span><ArrowUpRight size={18}/></div><h2>Agregar cliente</h2><p>Creá su ficha y después agregá sus campos y RENSPA.</p><span className="home-action-cta">Nuevo cliente <ArrowRight size={16}/></span></Link>}
 </div>
 <section id="mis-establecimientos" className="home-farms"><header><div><h2>Mis establecimientos</h2><p>Elegí el campo en el que querés trabajar.</p></div><label className="home-farm-search"><Search size={17}/><input aria-label="Buscar establecimientos" placeholder="Buscar campo, cliente o RENSPA" value={query} onChange={event=>setQuery(event.target.value)}/></label></header>
 {loading?<p role="status">Cargando establecimientos…</p>:error?<div className="data-error" role="alert">{error}<button className="secondary-button" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></div>:visible.length?<div className="home-farm-grid">{visible.map(farm=><Link key={farm.id} className="home-farm" to={`/establecimientos/${farm.id}`} style={{"--client-accent":farm.color} as CSSProperties}><div className="home-farm-client"><i/>{farm.client}</div><div className="home-farm-name"><h3>{farm.name}</h3><ArrowRight size={18}/></div><p>{[farm.locality,farm.province].filter(Boolean).join(" · ")||"Ubicación sin completar"}</p><small>{farm.renspas.length} RENSPA</small></Link>)}</div>:<div className="home-farm-empty"><h3>{farms.length?"No encontramos ese campo":"Todavía no hay establecimientos"}</h3><p>{farms.length?"Probá con otro nombre o RENSPA.":"Ingresá a un cliente para agregar su primer establecimiento."}</p>{!farms.length&&<Link className="secondary-button" to="/clientes">Ir a clientes</Link>}</div>}
 </section></section>
}
