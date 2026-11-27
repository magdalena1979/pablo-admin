import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Check, HeartPulse, Pencil, Plus } from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"
import { AppSelect } from "@/components/ui/AppSelect"
import { PageHeader } from "@/components/ui/Presentation"
import {
  healthActionTypes, listGeneralHealthPlan, saveHealthPlanItem,
  type GeneralHealthPlanItem, type HealthActionType, type HealthPlanDraft,
} from "./health-plan.service"
import { PlanCalendar, planMonths, sortHealthPlanGroups, workbookGroupOrder } from "./PlanCalendar"

const newDraft: HealthPlanDraft = { id: null, name: "", animalGroup: "", type: "vacunacion", months: [] }

function clickOutside(element: HTMLElement, x: number, y: number) {
  const bounds = element.getBoundingClientRect()
  return x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom
}

export function GeneralHealthPlanPage() {
  const { profile } = useAuth()
  if (profile?.role !== "super_admin") return <p role="alert">No tenés permiso para administrar el plan sanitario.</p>
  return <GeneralHealthPlanEditor/>
}

function GeneralHealthPlanEditor() {
  const { farms } = useFarmScope()
  const [items, setItems] = useState<GeneralHealthPlanItem[] | null>(null)
  const [draft, setDraft] = useState<HealthPlanDraft | null>(null)
  const [customGroup, setCustomGroup] = useState(false)
  const editorDialog = useRef<HTMLDialogElement>(null)
  const editorOpen = draft !== null
  const [view, setView] = useState<"calendar" | "table">("calendar")
  const [group, setGroup] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState("")
  const [loadError, setLoadError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [attempt, reload] = useState(0)

  useEffect(() => {
    if (!editorOpen) return
    const dialog = editorDialog.current
    const previous = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [editorOpen])

  useEffect(() => {
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)])
    setLoadError("")
    void listGeneralHealthPlan(signal).then(result => {
      if (!controller.signal.aborted) setItems(result)
    }).catch(cause => {
      if (!controller.signal.aborted) setLoadError(signal.aborted ? "El plan sanitario tardó demasiado en cargar."
        : cause instanceof Error ? cause.message : "No pudimos cargar el plan sanitario.")
    })
    return () => controller.abort()
  }, [attempt])

  const farmLabels = new Map(farms.map(farm => [farm.id, `${farm.name} · ${farm.clientName}`]))
  const farmLabel = (id: string) => farmLabels.get(id) ?? "Campo inactivo"
  const counts = new Map<string, number>()
  for (const item of items ?? []) counts.set(item.animal_group, (counts.get(item.animal_group) ?? 0) + 1)
  const groups = sortHealthPlanGroups(counts.keys())
  const editableGroups = sortHealthPlanGroups([...workbookGroupOrder, ...groups.filter(Boolean)])
  const selectedGroup = group !== null && counts.has(group) ? group : groups[0]
  const visible = items?.filter(item => item.animal_group === selectedGroup)
  const pages = Math.max(1, Math.ceil((visible?.length ?? 0) / 20))
  const currentPage = Math.min(page, pages)


  function edit(item?: GeneralHealthPlanItem) {
    setNotice("")
    setError("")
    setCustomGroup(false)
    setDraft(item ? {
      id: item.id, name: item.name, animalGroup: item.animal_group, type: item.action_type,
      months: item.planned_months,
    } : { ...newDraft, animalGroup: selectedGroup ?? "" })
  }

  function closeEditor() {
    if (busy) return
    setDraft(null)
    setError("")
  }

  async function mutate(operation: () => Promise<void>, message: string) {
    if (busy) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await operation()
      if (draft) {
        setPage(1)
        setGroup(draft.animalGroup.trim())
      }
      setDraft(null)
      setNotice(message)
      reload(value => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el cambio.")
    } finally {
      setBusy(false)
    }
  }

  return <section className="page general-health-plan">
    <div className="compact-list-heading general-health-plan-heading"><PageHeader title="Plan sanitario" actions={items &&
      <button type="button" className="primary-button" onClick={() => edit()}><Plus size={18}/> Nuevo trabajo</button>}/>
    </div>
    {notice && <p role="status">{notice}</p>}
    {draft && <dialog ref={editorDialog} className="dialog-card health-plan-editor-dialog" aria-labelledby="health-plan-editor-title"
      onCancel={event => { event.preventDefault(); closeEditor() }}
      onClick={event => {
        const { target, currentTarget, clientX, clientY } = event
        const clickedBackdrop = target === currentTarget ||
          (target instanceof HTMLDialogElement && target.classList.contains("app-select-popup") &&
            clickOutside(target, clientX, clientY))
        if (clickedBackdrop && clickOutside(currentTarget, clientX, clientY)) closeEditor()
      }}>
    <form className="general-health-plan-form" onSubmit={event => {
      event.preventDefault()
      if (draft.name.trim() && (!customGroup || draft.animalGroup.trim())) {
        void mutate(() => saveHealthPlanItem(draft), "Trabajo guardado.")
      }
    }}>
      <h2 id="health-plan-editor-title">{draft.id ? "Editar trabajo" : "Nuevo trabajo"}</h2>
      {error && <p className="data-error" role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <div className="form-grid">
          <label className="form-field">Nombre del trabajo
            <input autoFocus required maxLength={120} value={draft.name} placeholder="Ej. Segundo raspaje"
              onChange={event => setDraft({ ...draft, name: event.target.value })}/>
          </label>
          <label className="form-field">Grupo de animales (opcional)
            <AppSelect value={customGroup ? "new" : draft.animalGroup ? `group:${draft.animalGroup}` : ""}
              onChange={event => {
                const value = event.target.value
                setCustomGroup(value === "new")
                setDraft({ ...draft, animalGroup: value.startsWith("group:") ? value.slice(6) : "" })
              }}>
              <option value="">Sin grupo</option>
              {editableGroups.map(name => <option key={name} value={`group:${name}`}>{name}</option>)}
              <option value="new">Agregar otro grupo…</option>
            </AppSelect>
          </label>
          {customGroup && <label className="form-field">Nombre del grupo
            <input required maxLength={100} value={draft.animalGroup}
              onChange={event => setDraft({ ...draft, animalGroup: event.target.value })}/>
          </label>}
          <label className="form-field">Tipo de trabajo
            <AppSelect value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value as HealthActionType })}>
              {Object.entries(healthActionTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </AppSelect>
          </label>
        </div>
        <fieldset className="health-plan-month-editor">
          <legend>Meses previstos</legend>
          <div className="health-plan-month-options">
            {planMonths.map(month => <label key={month.number} className="health-plan-check">
              <input type="checkbox" checked={draft.months.includes(month.number)} onChange={event => setDraft({
                ...draft,
                months: event.target.checked ? [...draft.months, month.number] : draft.months.filter(value => value !== month.number),
              })}/>
              {month.name}
            </label>)}
          </div>
        </fieldset>
        <div className="general-health-plan-actions">
          <button type="submit" className="primary-button" disabled={!draft.name.trim()}>{busy ? "Guardando…" : "Guardar trabajo"}</button>
          <button type="button" className="secondary-button" onClick={closeEditor}>Cancelar</button>
        </div>
      </fieldset>
    </form></dialog>}
    <div className={`panel general-health-plan-list ${view === "calendar" ? "general-health-plan-board" : ""}`}>
      {view === "table" && <div className="health-plan-view-picker">
        <button type="button" className="plan-back-arrow secondary-button"
          aria-label="Volver al calendario anual" title="Volver al calendario anual" onClick={() => setView("calendar")}>
          <ArrowLeft size={18} aria-hidden="true"/>
        </button>
      </div>}
      {view === "table" && groups.length > 0 && <div className="health-plan-sheets" role="group" aria-label="Grupos de animales">
        {groups.map(value => <button key={value} type="button" className="health-plan-sheet"
          aria-pressed={selectedGroup === value} onClick={() => { setGroup(value); setPage(1) }}>
          {value || "Sin grupo"} <span>{counts.get(value)}</span>
        </button>)}
      </div>}
    {loadError ? <div className="data-error" role="alert">{loadError}
      <button type="button" className="secondary-button" onClick={() => reload(value => value + 1)}>Reintentar</button>
    </div> : !visible ? <p className="general-health-plan-empty" role="status">Cargando el plan sanitario…</p>
      : visible.length === 0 ? <div className="general-health-plan-empty">
        <HeartPulse size={25} aria-hidden="true"/>
        <h2>Todavía no hay trabajos en el plan</h2>
        <p>Los trabajos que agregues se aplican a los campos con actividad ganadera.</p>
      </div> : view === "calendar" ? <PlanCalendar<GeneralHealthPlanItem> items={items ?? []} groups={groups}
        assignedFields={item => item.health_plan_item_farms.filter(row => row.active).map(row => farmLabel(row.farm_id))}
        onOpenTable={() => setView("table")} onEdit={edit} editDisabled={Boolean(busy || draft)}/> : <div className="table-wrap">
      <table className="data-table health-plan-calendar" aria-label={`Trabajos del grupo ${selectedGroup || "Sin grupo"}`}>
        <thead><tr><th scope="col">Trabajo</th><th scope="col">Tipo</th>
          {planMonths.map(month => <th key={month.number} scope="col" className="health-plan-month-cell" aria-label={month.name}>{month.shortName}</th>)}
          <th scope="col">Campos</th><th scope="col" aria-label="Editar trabajo"/></tr></thead>
        <tbody>{visible.slice((currentPage - 1) * 20, currentPage * 20).map(item => {
          const fields = item.health_plan_item_farms.filter(row => row.active).map(row => farmLabel(row.farm_id))
          return <tr key={item.id}><td><strong>{item.name}</strong>
            {item.planned_months.length === 0 && <small className="health-plan-no-months">Sin meses definidos</small>}</td>
            <td>{healthActionTypes[item.action_type]}</td>
            {planMonths.map(month => <td key={month.number} className="health-plan-month-cell">
              {item.planned_months.includes(month.number) && <span className="health-plan-month-mark" role="img" aria-label="Previsto">
                <Check size={14} aria-hidden="true"/>
              </span>}
            </td>)}
            <td>{fields.join(", ") || "Sin campos ganaderos activos"}</td>
            <td><button type="button" className="health-plan-edit" aria-label={`Editar ${item.name}`} title="Editar trabajo"
              disabled={Boolean(busy || draft)} onClick={() => edit(item)}><Pencil size={16} aria-hidden="true"/></button></td>
          </tr>
        })}
        </tbody>
      </table>
    </div>}
      {view === "table" && pages > 1 && <nav className="animal-pagination" aria-label="Paginación de trabajos del plan">
        <button type="button" className="secondary-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
        <span>Página {currentPage} de {pages}</span>
        <button type="button" className="secondary-button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
      </nav>}
    </div>
  </section>
}
