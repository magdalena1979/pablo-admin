import { useEffect, useRef, useState } from "react"
import { NavLink, Link, Outlet, useLocation } from "react-router-dom"
import { PanelLeftClose, PanelLeftOpen, House, Bell, UsersRound, Tag, Beef, ClipboardList, Settings, ArrowLeft, ChevronDown, Menu, ShieldCheck, X } from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"
import { AutomaticTableTabs } from "@/components/layout/AutomaticTableTabs"
import { EstablishmentSwitcher } from "./EstablishmentSwitcher"
import "./sidebar.css"


export function AppShell() {
  const location = useLocation()

  const sectionName = location.pathname === "/inicio" ? "Inicio" : location.pathname.startsWith("/hacienda") ? "Hacienda" : location.pathname.startsWith("/caravanas") ? "Caravanas" : "Clientes"
  const [open, setOpen] = useState(false)
  const [collapsed,setCollapsed]=useState(false)
  const [profileOpen,setProfileOpen]=useState(false)
  const profileMenuRef=useRef<HTMLDivElement>(null)
  const { profile, configured, signOut } = useAuth()
  const { farms } = useFarmScope()
  const farmId = /^\/establecimientos\/([^/]+)/.exec(location.pathname)?.[1] || ""
  const activeFarm = farms.find(farm=>farm.id===farmId)
  const currentTab = new URLSearchParams(location.search).get("tab") || "hacienda"
  const displayName = profile?.fullName || "Pablo Mendivil"
  const roleLabel = profile?.role === "super_admin" ? "Super administrador" : profile?.role === "administrativo" ? "Administrativo" : configured ? "Empleado de campo" : "Modo sin conexión"
  const initials = displayName.split(" ").map(word => word[0]).slice(0,2).join("")
  useEffect(()=>{const close=(event:MouseEvent)=>{if(!profileMenuRef.current?.contains(event.target as Node))setProfileOpen(false)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[])
  return (
    <div className={`app-frame${collapsed ? " nav-is-collapsed" : ""}${farmId ? " is-client-scope" : ""}`} style={{"--farm-color":farmId ? activeFarm?.color??"#2D6AA3" : "#2D6AA3"} as React.CSSProperties}>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark">PM</div><div className="sidebar-brand-label"><strong>Pablo Mendivil</strong><span>Gestión agropecuaria</span></div><button className="sidebar-collapse-toggle" aria-expanded={!collapsed} aria-controls="primary-navigation" title={collapsed?"Expandir menú":"Contraer menú"} aria-label={collapsed?"Expandir menú":"Contraer menú"} onClick={()=>setCollapsed(value=>!value)}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button><button className="mobile-close" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X /></button></div>
        <nav id="primary-navigation" aria-label="Navegación principal">{farmId ? <>{[{tab:"hacienda",label:"Hacienda",icon:Beef},{tab:"trabajos",label:"Trabajos realizados",icon:ClipboardList},{tab:"caravanas",label:"Caravanas",icon:Tag},{tab:"datos",label:"Datos del establecimiento",icon:Settings}].map(({tab,label,icon:Icon})=><Link key={tab} title={label} aria-label={label} aria-current={currentTab===tab?"page":undefined} className={`nav-item nav-primary${currentTab===tab?" active":""}`} onClick={()=>setOpen(false)} to={`/establecimientos/${farmId}?${new URLSearchParams({...Object.fromEntries(new URLSearchParams(location.search)),tab})}`}><Icon size={19}/><span className="sidebar-nav-label">{label}</span></Link>)}<Link className="nav-item nav-primary sidebar-return" to="/inicio" title="Administración general" onClick={()=>setOpen(false)}><ArrowLeft size={19}/><span className="sidebar-nav-label">Administración general</span></Link></> : <><NavLink to="/inicio" title="Inicio" aria-label="Inicio" onClick={()=>setOpen(false)} className={({isActive})=>isActive?"nav-item nav-primary active":"nav-item nav-primary"}><House size={19}/><span className="sidebar-nav-label">Inicio</span></NavLink><NavLink to="/clientes" aria-label="Clientes" title="Clientes" onClick={()=>setOpen(false)} className={({isActive})=>isActive?"nav-item nav-primary active":"nav-item nav-primary"}><UsersRound size={19}/><span className="sidebar-nav-label">Clientes</span></NavLink></>}</nav>
      </aside>
      {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}
      <main className="main">
        <header className="topbar"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu /></button><EstablishmentSwitcher sectionName={sectionName}/><div className="topbar-actions"><div className="topbar-profile" ref={profileMenuRef}><button className="profile-trigger" type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={()=>setProfileOpen(value=>!value)}><span className="avatar">{initials}</span><span className="profile-summary"><strong>{displayName}</strong><small>{roleLabel}</small></span><ChevronDown size={15} className={profileOpen?"chevron expanded":"chevron"}/></button>{profileOpen&&<div className="profile-menu" role="menu"><div><strong>{displayName}</strong><span><ShieldCheck size={13}/>{roleLabel}</span></div>{profile&&<button type="button" role="menuitem" onClick={() => void signOut()}>Cerrar sesión</button>}</div>}</div><button className="icon-button" aria-label="Notificaciones"><Bell size={20} /><i /></button></div></header>
        <AutomaticTableTabs/><Outlet />
      </main>
    </div>
  )
}
