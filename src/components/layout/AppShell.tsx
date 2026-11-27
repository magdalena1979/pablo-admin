import { useEffect, useId, useRef, useState } from "react"
import { NavLink, Link, Outlet, useLocation } from "react-router-dom"
import {
  PanelLeftClose, PanelLeftOpen, House, Bell, UsersRound, Tag, Beef, HeartPulse, List,
  ClipboardList, Settings, ArrowLeft, ChevronDown, Plus, ShieldCheck, X,
} from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"
import { AutomaticTableTabs } from "@/components/layout/AutomaticTableTabs"
import { EstablishmentSwitcher } from "./EstablishmentSwitcher"
import "./sidebar.css"

const generalLinks = [
  { path: "/inicio", label: "Inicio", icon: House },
  { path: "/clientes", label: "Clientes", icon: UsersRound },
  { path: "/trabajos", label: "Trabajos", icon: ClipboardList },
  { path: "/plan-sanitario", label: "Plan sanitario", icon: HeartPulse },
]

const farmTabs = [
  { tab: "hacienda", label: "Hacienda", shortLabel: "Hacienda", icon: Beef },
  { tab: "animales", label: "Animales", shortLabel: "Animales", icon: List },
  { tab: "sanidad", label: "Sanidad", shortLabel: "Sanidad", icon: HeartPulse },
  { tab: "trabajos", label: "Trabajos realizados", shortLabel: "Trabajos", icon: ClipboardList },
  { tab: "caravanas", label: "Caravanas", shortLabel: "Caravanas", icon: Tag },
  { tab: "datos", label: "Datos del establecimiento", shortLabel: "Datos", icon: Settings },
]

export function AppShell() {
  const location = useLocation()
  const receptionSaved = (location.state as { earTagReceptionSaved?: unknown } | null)?.earTagReceptionSaved
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuth()
  const { farms } = useFarmScope()
  const farmId = /^\/establecimientos\/([^/]+)/.exec(location.pathname)?.[1] || ""
  const activeFarm = farms.find(farm => farm.id === farmId)
  const params = new URLSearchParams(location.search)
  const currentTab = (params.get("tab") || "hacienda") === "hacienda" && params.get("vista") === "animales" ? "animales" : params.get("tab") || "hacienda"
  const clientId = location.pathname === "/clientes" ? params.get("cliente") : null
  const clientAction = (action: string) => `/clientes?${new URLSearchParams({ cliente: clientId ?? "", accion: action })}`
  const canReceive = profile?.role === "super_admin"
  const links = generalLinks.filter(link =>
    (link.path !== "/trabajos" || canReceive) && (link.path !== "/plan-sanitario" || profile?.role === "super_admin"))
  const farmPath = (tab: string) => {
    const next = new URLSearchParams(params)
    next.delete("vista")
    next.set("tab", tab)
    return `/establecimientos/${farmId}?${next}`
  }
  const farmLinks = farmTabs.map(tab => ({
    ...tab,
    path: farmPath(tab.tab),
  }))
  const mobileReceptionPath = farmId
    ? `/establecimientos/${farmId}?${new URLSearchParams({ ...Object.fromEntries(params), tab: "caravanas", nueva: "1" })}`
    : clientId ? clientAction("caravanas") + "&nueva=1" : "/caravanas?nueva=1"
  const mobileReceptionState = { receptionReturnTo: location.pathname + location.search + location.hash }

  return <div className={`app-frame${collapsed ? " nav-is-collapsed" : ""}${farmId ? " is-client-scope" : ""}`}
    style={{ "--farm-color": activeFarm?.color ?? "#2D6AA3" } as React.CSSProperties}>
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">PM</div>
        <div className="sidebar-brand-label"><strong>Pablo Mendivil</strong><span>Gestión agropecuaria</span></div>
        <button className="sidebar-collapse-toggle" aria-expanded={!collapsed} aria-controls="primary-navigation"
          title={collapsed ? "Expandir menú" : "Contraer menú"} aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          onClick={() => setCollapsed(value => !value)}>
          {collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}
        </button>
      </div>
      <nav id="primary-navigation" aria-label="Navegación principal">
        {farmId ? <>
          {farmLinks.map(({ tab, path, label, icon: Icon }) => <Link key={tab} to={path} title={label} aria-label={label}
            aria-current={currentTab === tab ? "page" : undefined} className={`nav-item nav-primary${currentTab === tab ? " active" : ""}`}>
            <Icon size={19}/><span className="sidebar-nav-label">{label}</span>
          </Link>)}
          <Link className="nav-item nav-primary sidebar-return" to="/inicio" title="Administración general">
            <ArrowLeft size={19}/><span className="sidebar-nav-label">Administración general</span>
          </Link>
        </> : links.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} title={label} aria-label={label}
            className={({ isActive }) => `nav-item nav-primary${isActive ? " active" : ""}`}>
            <Icon size={19}/><span className="sidebar-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-user">
        <button className="icon-button sidebar-notifications" type="button" aria-label="Notificaciones"><Bell size={20}/><i/></button>
        <AccountMenu key={`${location.key}:${collapsed}`}/>
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <EstablishmentSwitcher/>
        <AccountMenu key={location.key} mobile/>
      </header>
      {farmId && <nav className="mobile-farm-nav" aria-label="Secciones del establecimiento">
        {farmLinks.filter(({ tab }) => ["hacienda", "animales", "sanidad", "datos"].includes(tab)).map(({ tab, path, label, shortLabel }) => (
          <Link key={tab} to={path} aria-label={label} aria-current={currentTab === tab ? "page" : undefined}>{shortLabel}</Link>
        ))}
      </nav>}
      {typeof receptionSaved === "string" && <ReceptionNotice key={location.key} message={receptionSaved}/>}
      <AutomaticTableTabs/><Outlet/>
    </main>
    <nav className="mobile-bottom-nav" aria-label="Navegación principal">
      {links.filter(link => !farmId || link.path !== "/trabajos").map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} className="mobile-nav-item">
        <Icon size={20} aria-hidden="true"/><span>{label}</span>
      </NavLink>)}
      {farmId && <Link to={farmPath("trabajos")} className="mobile-nav-item" aria-current={currentTab === "trabajos" ? "page" : undefined}>
        <ClipboardList size={20} aria-hidden="true"/><span>Trabajos</span>
      </Link>}
      {(canReceive || farmId) && <Link to={canReceive ? mobileReceptionPath : farmPath("caravanas")} state={canReceive && !clientId ? mobileReceptionState : undefined}
        className="mobile-nav-item" aria-current={(farmId ? currentTab === "caravanas" : location.pathname === "/caravanas") ? "page" : undefined}>
        <Tag size={20} aria-hidden="true"/><span>Caravanas</span>
      </Link>}
      <NavLink to={farmId ? farmPath("importar") : clientId ? clientAction("csv") : "/hacienda"} className="mobile-nav-item mobile-csv-link" aria-label="Importar CSV">
        <Plus size={18} aria-hidden="true"/><span>CSV</span>
      </NavLink>
    </nav>
  </div>
}

function ReceptionNotice({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setDismissed(true), 5000)
    return () => window.clearTimeout(timer)
  }, [])
  if (dismissed) return null
  return <div className="success-strip reception-notice">
    <span role="status">{message}</span>
    <button type="button" className="icon-button" aria-label="Cerrar aviso" onClick={() => setDismissed(true)}><X size={18} aria-hidden="true"/></button>
  </div>
}

function AccountMenu({ mobile = false }: { mobile?: boolean }) {
  const { profile, configured, signOut } = useAuth()
  const menuId = useId()
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const displayName = profile?.fullName || "Pablo Mendivil"
  const roleLabel = profile?.role === "super_admin" ? "Super administrador" :
    profile?.role === "administrativo" ? "Administrativo" : configured ? "Empleado de campo" : "Modo sin conexión"
  const initials = displayName.split(" ").map(word => word[0]).slice(0, 2).join("")

  useEffect(() => {
    if (!isOpen) return
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener("pointerdown", closeOutside, true)
    return () => document.removeEventListener("pointerdown", closeOutside, true)
  }, [isOpen])

  return <div className={mobile ? "mobile-account" : "sidebar-profile"} ref={menu} onKeyDown={event => {
    if (event.key === "Escape" && isOpen) {
      setIsOpen(false)
      trigger.current?.focus()
    }
  }}>
    <button ref={trigger} className={mobile ? "mobile-account-trigger" : "profile-trigger"} type="button"
      aria-label={`Cuenta de ${displayName}`} title={displayName} aria-expanded={isOpen} aria-controls={menuId}
      onClick={() => setIsOpen(value => !value)}>
      <span className="avatar" aria-hidden="true">{initials}</span>
      {!mobile && <>
        <span className="profile-summary"><strong>{displayName}</strong><small>{roleLabel}</small></span>
        <ChevronDown size={15} className="chevron" aria-hidden="true"/>
      </>}
    </button>
    <div id={menuId} className="profile-menu" hidden={!isOpen}>
      <div><strong>{displayName}</strong><span><ShieldCheck size={13} aria-hidden="true"/>{roleLabel}</span></div>
      {profile && <button type="button" onClick={() => void signOut()}>Cerrar sesión</button>}
    </div>
  </div>
}
