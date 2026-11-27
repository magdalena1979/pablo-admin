import { useState } from "react"
import { ArrowLeft, Pencil } from "lucide-react"
import { healthActionTypes, type HealthPlanCompletion, type ScheduledHealthPlanItem } from "./health-plan.service"
import { formatLivestockDate } from "./livestock-date"
import { healthPlanStageFor, healthPlanStages, type HealthPlanStage } from "./health-plan-stages"
import "./general-health-plan.css"

export const planMonths = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
].map((name, index) => ({ name, shortName: name.slice(0, 3), number: index + 1 }))
export const workbookGroupOrder = [
  "Vacas", "Terneros al pie", "Invernada", "Toros",
  "Vaquillonas de primer servicio de otoño", "Vacas paridas de otoño", "Terneros de otoño al pie",
]


export function sortHealthPlanGroups(names: Iterable<string>) {
  const groups = new Set(names)
  return [
    ...workbookGroupOrder.filter(name => groups.has(name)),
    ...[...groups].filter(name => !workbookGroupOrder.includes(name)).sort((a, b) => a.localeCompare(b, "es")),
  ]
}

function groupColor(name: string) {
  const index = workbookGroupOrder.indexOf(name)
  return index >= 0 ? index : 7
}

export function PlanCalendar<T extends ScheduledHealthPlanItem>({ items, groups, assignedFields, onEdit, editDisabled, progress, onOpenTable }: {
  items: T[]
  groups: string[]
  assignedFields?(item: T): string[]
  onEdit?(item: T): void
  editDisabled?: boolean
  progress?: ReadonlyMap<string, HealthPlanCompletion[]>
  onOpenTable?(): void
}) {
  const [month, setMonth] = useState<number | null>(null)
  const [itemId, setItemId] = useState("")
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [byStage, setByStage] = useState(false)
  const [stage, setStage] = useState<HealthPlanStage | null>(null)
  const types = new Set<string>(items.map(item => item.action_type))
  const activeGroups = selectedGroups.filter(group => groups.includes(group))
  const activeTypes = selectedTypes.filter(type => types.has(type))
  const filtered = items.filter(item =>
    (!activeGroups.length || activeGroups.includes(item.animal_group)) &&
    (!activeTypes.length || activeTypes.includes(item.action_type)))
  function completions(item: T, number: number) {
    return progress?.get(`${item.id}:${number}`) ?? []
  }

  const byMonth = planMonths.map(entry => ({
    ...entry,
    items: filtered.filter(item =>
      (!byStage || stage === null || healthPlanStageFor(item.animal_group, entry.number) === stage) &&
      (item.planned_months.includes(entry.number) || completions(item, entry.number).length > 0)),
    stages: [...new Set((activeGroups.length ? activeGroups : groups).map(group => healthPlanStageFor(group, entry.number)))]
      .filter(value => value !== "general" && (stage === null || stage === value)),
  }))
  const unscheduled = byStage && stage !== null ? [] : filtered.filter(item => item.planned_months.length === 0)
  const selectedMonth = month ? byMonth[month - 1] : null
  const monthlyItems = selectedMonth?.items ?? unscheduled
  const selected = monthlyItems.find(item => item.id === itemId)
  const selectedCompletions = selected && selectedMonth ? completions(selected, selectedMonth.number) : []

  function openMonth(value: number, id = "") {
    setMonth(value)
    setItemId(id)
  }

  function groupTag(name: string) {
    return <span className="plan-group-tag" data-group-color={groupColor(name)}>{name || "Sin grupo"}</span>
  }

  return <div className={`plan-calendar ${month === null ? "plan-calendar-annual" : ""}`}>
    <header className="plan-calendar-heading">
      <div className="plan-calendar-title">
        {month !== null && <button className="plan-back-arrow secondary-button" type="button"
          aria-label="Volver al calendario anual" title="Volver al calendario anual" onClick={() => setMonth(null)}>
          <ArrowLeft size={18} aria-hidden="true"/>
        </button>}
        <h2>{month === null ? "Calendario anual" : selectedMonth?.name ?? "Sin mes definido"}</h2>
      </div>
      {month === null && onOpenTable && <button className="plan-calendar-back" type="button" onClick={onOpenTable}>
        Cronograma
      </button>}
      {selectedMonth && <div className="plan-calendar-arrows">
        <button type="button" className="secondary-button" aria-label="Mes anterior" disabled={month === 1}
          onClick={() => openMonth(selectedMonth.number - 1)}>Anterior</button>
        <button type="button" className="secondary-button" aria-label="Mes siguiente" disabled={month === 12}
          onClick={() => openMonth(selectedMonth.number + 1)}>Siguiente</button>
      </div>}
    </header>
    {month === null && <div className="plan-calendar-filters">
      <CalendarFilter label="Grupos de animales" options={groups.map(value => ({ value, label: value || "Sin grupo", color: groupColor(value) }))}
        selected={activeGroups} onChange={setSelectedGroups}/>
      <CalendarFilter label="Tipos de trabajo" options={Object.entries(healthActionTypes)
        .map(([value, label], color) => ({ value, label, color })).filter(option => types.has(option.value))}
        selected={activeTypes} onChange={setSelectedTypes}/>
      <div className="plan-stage-filter">
        <label className="plan-stage-toggle">
          <input type="checkbox" role="switch" checked={byStage} onChange={event => {
            setByStage(event.target.checked)
            setStage(null)
          }}/>
          Ver por etapa
        </label>
        {byStage && <div className="plan-stage-options" role="group" aria-label="Etapa">
          {(Object.keys(healthPlanStages) as HealthPlanStage[]).map(value => <button type="button" key={value}
            className="plan-stage-tag" data-stage={value} aria-pressed={stage === value}
            onClick={() => setStage(stage === value ? null : value)}>{healthPlanStages[value]}</button>)}
        </div>}
      </div>
    </div>}
    {month === null ? <>
      <div className="plan-year-grid">
        {byMonth.map(entry => {
          const done = progress ? entry.items.filter(item => completions(item, entry.number).length > 0).length : 0
          return <section className="plan-month-card" key={entry.number} aria-label={entry.name}>
            <h3 className="plan-month-card-heading">
              <button className="plan-month-open" type="button" aria-label={`Abrir ${entry.name}`}
                onClick={() => openMonth(entry.number)}>{entry.name}</button>
              <span className="plan-month-total">{entry.items.length} {entry.items.length === 1 ? "trabajo" : "trabajos"}</span>
            </h3>
            {byStage && !!entry.stages.length && <div className="plan-stage-options">
              {entry.stages.map(value => <StageTag key={value} stage={value}/>)}
            </div>}
            {entry.items.length ? <>
              {progress && <p className="plan-month-progress">{done} realizados · {entry.items.length - done} pendientes</p>}
              <ul className="plan-month-rows">{entry.items.map(item => <li key={item.id}>
                <button type="button" onClick={() => openMonth(entry.number, item.id)}>
                  <span>{item.name}</span>
                  <span className="plan-month-row-tags">{groupTag(item.animal_group)}
                    {byStage && <StageTag stage={healthPlanStageFor(item.animal_group, entry.number)}/>}
                    {progress && <WorkStatus done={completions(item, entry.number).length > 0}/>}
                  </span>
                </button>
              </li>)}</ul>
            </> : <p className="plan-month-card-count">Sin trabajos previstos</p>}
          </section>
        })}
      </div>
      {!!unscheduled.length && <button type="button" className="secondary-button" onClick={() => openMonth(0)}>
        Sin mes definido ({unscheduled.length})
      </button>}
    </> : !monthlyItems.length ? <p className="plan-month-empty">No hay trabajos previstos para esta selección.</p> :
        <ul className="plan-work-list" aria-label="Trabajos del mes">
          {monthlyItems.map(item => <li key={item.id}><button type="button" aria-expanded={item.id === selected?.id}
            onClick={() => setItemId(item.id === itemId ? "" : item.id)}>
            <strong>{item.name}</strong>
            <span className="plan-month-row-tags">{groupTag(item.animal_group)}
              {byStage && selectedMonth && <StageTag stage={healthPlanStageFor(item.animal_group, selectedMonth.number)}/>}
              {progress && selectedMonth && <WorkStatus done={completions(item, selectedMonth.number).length > 0}/>}
            </span>
          </button>
        {selected?.id === item.id && <section className="plan-work-detail" aria-label={`Detalle de ${selected.name}`}>
          <dl>
            <div><dt>Tipo</dt><dd>{healthActionTypes[selected.action_type]}</dd></div>
            <div><dt>Meses previstos</dt><dd>{planMonths.filter(entry => selected.planned_months.includes(entry.number))
              .map(entry => entry.name).join(", ") || "Sin mes definido"}</dd></div>
            {progress && selectedMonth && <div><dt>Estado en {selectedMonth.name.toLowerCase()}</dt>
              {!!selectedCompletions.length && !selected.planned_months.includes(selectedMonth.number) &&
                <dd>Realizado fuera de los meses previstos.</dd>}
              {!selectedCompletions.length && <dd>Sin jornada vinculada en este mes.</dd>}
              {!!selectedCompletions.length && selected.planned_months.includes(selectedMonth.number) &&
                <dd>{selectedCompletions.length} {selectedCompletions.length === 1 ? "jornada vinculada" : "jornadas vinculadas"}</dd>}
            </div>}
            {assignedFields && <div><dt>Campos asignados</dt><dd>{assignedFields(selected).join(", ") || "Sin campos asignados"}</dd></div>}
          </dl>
          {onEdit && <button type="button" className="health-plan-edit" aria-label={`Editar ${selected.name}`}
            title="Editar trabajo" disabled={editDisabled} onClick={() => onEdit(selected)}><Pencil size={16} aria-hidden="true"/></button>}
          {(selected.reference_product || selected.reference_dose || selected.reference_schedule) && <section
            className="plan-work-evidence" aria-label="Datos del Excel">
            <h4>Datos del Excel</h4>
            <dl>
              {selected.reference_product && <div><dt>Producto o principio activo</dt><dd>{selected.reference_product}</dd></div>}
              {selected.reference_schedule && <div><dt>Aplicaciones e intervalo</dt><dd>{selected.reference_schedule}</dd></div>}
              {selected.reference_dose && <div><dt>Cantidad por animal</dt><dd>{selected.reference_dose}</dd></div>}
            </dl>
          </section>}
          {!!selectedCompletions.length && <section className="plan-work-evidence">
            <h4>Jornadas vinculadas</h4>
            <ul>{selectedCompletions.map(entry => <li key={entry.id}>
              <strong>{formatLivestockDate(entry.date)}</strong> · {entry.filename}
            </li>)}</ul>
          </section>}
        </section>}
          </li>)}
        </ul>}
  </div>
}

function StageTag({ stage }: { stage: HealthPlanStage }) {
  return <span className="plan-stage-tag" data-stage={stage}>{healthPlanStages[stage]}</span>
}

function CalendarFilter({ label, options, selected, onChange }: {
  label: string
  options: Array<{ value: string; label: string; color: number }>
  selected: string[]
  onChange(values: string[]): void
}) {
  return <fieldset className="plan-calendar-filter">
    <legend>{label}</legend>
    <div className="plan-calendar-filter-options">
      {options.map(option => <label className="plan-group-tag plan-filter-chip" key={option.value} data-group-color={option.color}>
        <input type="checkbox" checked={selected.includes(option.value)} onChange={event =>
          onChange(event.target.checked ? [...selected, option.value] : selected.filter(value => value !== option.value))}/>
        {option.label}
      </label>)}
      {!!selected.length && <button type="button" className="plan-calendar-back" onClick={() => onChange([])}>Limpiar selección</button>}
    </div>
  </fieldset>
}

function WorkStatus({ done }: { done: boolean }) {
  return <span className={done ? "plan-work-status is-done" : "plan-work-status"}>{done ? "Realizado" : "Pendiente"}</span>
}
