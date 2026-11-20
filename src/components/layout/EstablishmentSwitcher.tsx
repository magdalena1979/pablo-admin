import { useEffect, useRef } from "react"
import { Check, ChevronDown, Landmark } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"
import "./establishment-switcher.css"

export function EstablishmentSwitcher() {
  const { farms, loading } = useFarmScope()
  const location = useLocation()
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const fieldId = /^\/establecimientos\/([^/]+)/.exec(location.pathname)?.[1] || ""
  const current = farms.find(farm => farm.id === fieldId)
  const tab = fieldId ? new URLSearchParams(location.search).get("tab") : null
  const tabQuery = tab ? `?${new URLSearchParams({ tab })}` : ""

  useEffect(() => {
    const element = menu.current
    if (element) element.open = false
  }, [location.key])

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      const element = menu.current
      if (element?.open && event.target instanceof Node && !element.contains(event.target)) element.open = false
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [])

  return <details ref={menu} className={`header-establishment${fieldId ? " is-scoped" : ""}`}
    onKeyDown={event => {
      if (event.key === "Escape" && event.currentTarget.open) {
        event.preventDefault()
        event.currentTarget.open = false
        trigger.current?.focus()
      }
    }}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
    }}>
    <summary ref={trigger} className="header-establishment-trigger">
      <span className="header-field-icon" aria-hidden="true"><Landmark size={20}/></span>
      <span className="header-field-text">
        <small>Establecimiento</small>
        <strong>{current ? `${current.name} · ${current.clientName}` : fieldId ? "Establecimiento actual" : "Vista general"}</strong>
      </span>
      <ChevronDown className="header-field-chevron" size={16} aria-hidden="true"/>
    </summary>
    <nav className="header-field-options" aria-label="Cambiar establecimiento">
      <Link to="/inicio" aria-current={!fieldId || undefined}>
        <strong>Vista general</strong>{!fieldId && <Check size={16} aria-hidden="true"/>}
      </Link>
      {loading && <p role="status">Cargando establecimientos…</p>}
      {farms.map(farm => <Link key={farm.id}
        to={farm.id === fieldId ? location.pathname + location.search : `/establecimientos/${farm.id}${tabQuery}`}
        aria-current={farm.id === fieldId || undefined}>
        <span><strong>{farm.name}</strong><small>{farm.clientName}</small></span>
        {farm.id === fieldId && <Check size={16} aria-hidden="true"/>}
      </Link>)}
    </nav>
  </details>
}
