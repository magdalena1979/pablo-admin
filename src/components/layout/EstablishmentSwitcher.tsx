import { Landmark } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"
import "./establishment-switcher.css"

export function EstablishmentSwitcher({ sectionName }: { sectionName:string }) {
  const { farms, loading } = useFarmScope()
  const location = useLocation()
  const navigate = useNavigate()
  // The URL identifies the displayed field; a stored selection may belong to another page.
  const fieldId = /^\/establecimientos\/([^/]+)/.exec(location.pathname)?.[1] || ""
  const current = farms.find(farm => farm.id === fieldId)
  function change(id:string) {
    if (!id) { navigate("/inicio"); return }
    const tab = fieldId ? new URLSearchParams(location.search).get("tab") : null
    const next = new URLSearchParams()
    if (tab) next.set("tab", tab)
    navigate(`/establecimientos/${id}${next.size ? `?${next}` : ""}`)
  }
  return <div className={`header-establishment ${fieldId ? "is-scoped" : ""}`}>
    <span className="header-field-icon" aria-hidden="true"><Landmark size={22}/></span><label htmlFor="header-establishment">Establecimiento</label>
    <select id="header-establishment" value={fieldId} disabled={loading} onChange={event => change(event.target.value)}>
      <option value="">{loading ? "Cargando establecimientos…" : "Vista general · Seleccionar campo"}</option>
      {fieldId && !current && <option value={fieldId}>Establecimiento actual</option>}
      {farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name} · {farm.clientName}</option>)}
    </select>
    <span>{fieldId ? current?.clientName || "Establecimiento seleccionado" : `${sectionName} · Vista general`}</span>
  </div>
}
