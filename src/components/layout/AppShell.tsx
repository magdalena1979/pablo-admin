import { useEffect, useRef, useState, type ComponentType } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Bell, Beef, Check, ChevronDown, Hammer, LayoutDashboard, Menu, Settings, ShieldCheck, Stethoscope, Tractor, X } from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"
import { AutomaticTableTabs } from "@/components/layout/AutomaticTableTabs"

type NavEntry=readonly[label:string,href:string,icon:ComponentType<{size?:number}>]
const groups:{id:string;label:string;icon:ComponentType<{size?:number}>;items:readonly NavEntry[]}[]=[
  {id:"produccion",label:"Producción",icon:Tractor,items:[["Hacienda","/hacienda",Beef],["Sanidad y reproducción","/sanidad",Stethoscope],["Labores y costos","/labores",Hammer]]},
]

function NavGroup({group,onNavigate}:{group:typeof groups[number];onNavigate():void}){const location=useLocation();const active=group.items.some(([,href])=>location.pathname.startsWith(href));const[expanded,setExpanded]=useState(active);useEffect(()=>{if(active)setExpanded(true)},[active]);const Icon=group.icon;return <div className={`nav-group ${active?"has-active":""}`}><button className="nav-group-trigger" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded}><Icon size={19}/><span>{group.label}</span><ChevronDown size={16} className={expanded?"chevron expanded":"chevron"}/></button>{expanded&&<div className="nav-children">{group.items.map(([label,href,ItemIcon])=><NavLink key={href} to={href} onClick={onNavigate} className={({isActive})=>isActive?"nav-item nav-child active":"nav-item nav-child"}><ItemIcon size={17}/>{label}</NavLink>)}</div>}</div>}

export function AppShell() {
  const [open, setOpen] = useState(false)
  const [farmOpen,setFarmOpen]=useState(false)
  const [profileOpen,setProfileOpen]=useState(false)
  const farmPickerRef=useRef<HTMLDivElement>(null)
  const profileMenuRef=useRef<HTMLDivElement>(null)
  const { profile, configured, signOut } = useAuth()
  const { farms, selectedFarmId, selectedFarm, loading: farmsLoading, selectFarm } = useFarmScope()
  const displayName = profile?.fullName || "Pablo Mendivil"
  const roleLabel = profile?.role === "super_admin" ? "Super administrador" : profile?.role === "administrativo" ? "Administrativo" : configured ? "Empleado de campo" : "Modo sin conexión"
  const initials = displayName.split(" ").map(word => word[0]).slice(0,2).join("")
  useEffect(()=>{const close=(event:MouseEvent)=>{if(!farmPickerRef.current?.contains(event.target as Node))setFarmOpen(false);if(!profileMenuRef.current?.contains(event.target as Node))setProfileOpen(false)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[])
  return (
    <div className="app-frame" style={{"--farm-color":selectedFarm?.color??"#2D6AA3"} as React.CSSProperties}>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark">PM</div><div><strong>Pablo Mendivil</strong><span>Gestión agropecuaria</span></div><button className="mobile-close" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X /></button></div>
        <nav aria-label="Navegación principal"><NavLink to="/" end onClick={()=>setOpen(false)} className={({isActive})=>isActive?"nav-item nav-primary active":"nav-item nav-primary"}><LayoutDashboard size={19}/>Panel general</NavLink><div className="nav-divider"/><span className="nav-caption">ÁREAS DE TRABAJO</span>{groups.map(group=><NavGroup key={group.id} group={group} onNavigate={()=>setOpen(false)}/>)}</nav>
        <NavLink to="/configuracion" onClick={()=>setOpen(false)} className={({isActive})=>isActive?"nav-item nav-settings active":"nav-item nav-settings"}><Settings size={19}/>Configuración</NavLink>
      </aside>
      {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}
      <main className="main">
        <header className="topbar"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu /></button><div className="farm-switcher" ref={farmPickerRef}><span className="eyebrow">CAMPAÑA 2026/27</span><button className="farm-select-trigger" type="button" disabled={farmsLoading} aria-haspopup="listbox" aria-expanded={farmOpen} onClick={()=>setFarmOpen(value=>!value)}><span className="farm-select-dot" style={{background:selectedFarm?.color??"#2D6AA3"}}/><span><strong>{selectedFarm?.name??"Vista consolidada"}</strong><small>{selectedFarm?selectedFarm.locality:"Todos los campos"}</small></span><ChevronDown size={16} className={farmOpen?"chevron expanded":"chevron"}/></button>{farmOpen&&<div className="farm-select-menu" role="listbox" aria-label="Seleccionar campo de trabajo"><button className={!selectedFarmId?"selected":""} role="option" aria-selected={!selectedFarmId} onClick={()=>{selectFarm(null);setFarmOpen(false)}}><span className="farm-select-dot global"/><span><strong>Vista consolidada</strong><small>Todos los campos administrados</small></span>{!selectedFarmId&&<Check size={17}/>}</button>{farms.map(farm=><button key={farm.id} className={farm.id===selectedFarmId?"selected":""} role="option" aria-selected={farm.id===selectedFarmId} onClick={()=>{selectFarm(farm.id);setFarmOpen(false)}}><span className="farm-select-dot" style={{background:farm.color}}/><span><strong>{farm.name}</strong><small>{farm.locality} · {farm.serviceMode==="administracion_integral"?"Administración integral":"Veterinaria"}</small></span>{farm.id===selectedFarmId&&<Check size={17}/>}</button>)}</div>}</div><div className="topbar-actions"><div className="scope-chip"><span>{selectedFarm?"CAMPO ACTIVO":"MODO GLOBAL"}</span><strong>{selectedFarm?.name??`${farms.length} campos`}</strong></div><button className="icon-button" aria-label="Notificaciones"><Bell size={20} /><i /></button><div className="topbar-profile" ref={profileMenuRef}><button className="profile-trigger" type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={()=>setProfileOpen(value=>!value)}><span className="avatar">{initials}</span><span className="profile-summary"><strong>{displayName}</strong><small>{roleLabel}</small></span><ChevronDown size={15} className={profileOpen?"chevron expanded":"chevron"}/></button>{profileOpen&&<div className="profile-menu" role="menu"><div><strong>{displayName}</strong><span><ShieldCheck size={13}/>{roleLabel}</span></div>{profile&&<button type="button" role="menuitem" onClick={() => void signOut()}>Cerrar sesión</button>}</div>}</div></div></header>
        <AutomaticTableTabs/><Outlet />
      </main>
    </div>
  )
}
