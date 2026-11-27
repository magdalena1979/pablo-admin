import { useEffect, useState } from "react"
import {
  listFarmHealthPlanCalendar, listFarmHealthPlanCompletions, listRecentHealthPlanUses,
  type ScheduledHealthPlanItem, type HealthPlanUse, type HealthPlanCompletion,
} from "./health-plan.service"
import { PlanCalendar, sortHealthPlanGroups } from "./PlanCalendar"
import { formatLivestockDate } from "./livestock-date"
import { healthPlanProgress } from "./health-plan-progress"

export function HealthPlanPanel({ farmId }: { farmId: string }) {
  const [items, setItems] = useState<ScheduledHealthPlanItem[] | null>(null)
  const [uses, setUses] = useState<HealthPlanUse[] | null>(null)
  const [attempt, retry] = useState(0)
  const [loadError, setLoadError] = useState("")
  const [usesError, setUsesError] = useState(false)
  const [year, setYear] = useState(() => Number(new Intl.DateTimeFormat("en", {
    year: "numeric", timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date())))
  const [yearly, setYearly] = useState<{ year: number; rows: HealthPlanCompletion[] } | null>(null)
  const [progressError, setProgressError] = useState("")
  const [progressAttempt, retryProgress] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)])
    setLoadError("")
    setUsesError(false)
    void listFarmHealthPlanCalendar(farmId, signal).then(result => {
      if (!controller.signal.aborted) setItems(result)
    }).catch(cause => {
      if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : "No pudimos cargar el plan sanitario.")
    })
    void listRecentHealthPlanUses(farmId, signal).then(result => {
      if (!controller.signal.aborted) setUses(result)
    }).catch(() => {
      if (!controller.signal.aborted) setUsesError(true)
    })
    return () => controller.abort()
  }, [farmId, attempt])

  const hasItems = Boolean(items?.length)
  useEffect(() => {
    if (!hasItems) return
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)])
    setProgressError("")
    void listFarmHealthPlanCompletions(farmId, year, signal).then(rows => {
      if (!controller.signal.aborted) setYearly({ year, rows })
    }).catch(cause => {
      if (!controller.signal.aborted) setProgressError(cause instanceof Error ? cause.message : "No pudimos cargar el estado de los trabajos.")
    })
    return () => controller.abort()
  }, [farmId, hasItems, year, progressAttempt])

  const progress = yearly?.year === year ? healthPlanProgress(yearly.rows, year) : undefined

  function changeYear(value: number) {
    setProgressError("")
    setYear(value)
  }

  return <div>
    {loadError ? <div className="data-error" role="alert">{loadError}
      <button type="button" className="secondary-button" onClick={() => retry(value => value + 1)}>Reintentar</button>
    </div> : !items ? <p role="status">Cargando el plan sanitario…</p> : items.length === 0
      ? <p>Todavía no hay trabajos disponibles. El plan general se aplica a los campos con actividad ganadera configurada.</p>
      : <>
        <div className="plan-year-controls" role="group" aria-label="Año de seguimiento">
          <button type="button" className="secondary-button" aria-label="Año anterior" disabled={year <= 1900}
            onClick={() => changeYear(year - 1)}>Año anterior</button>
          <strong aria-live="polite">{year}</strong>
          <button type="button" className="secondary-button" aria-label="Año siguiente" disabled={year >= 2099}
            onClick={() => changeYear(year + 1)}>Año siguiente</button>
        </div>
        {progressError ? <div className="data-error" role="alert">{progressError}
          <button type="button" className="secondary-button" onClick={() => retryProgress(value => value + 1)}>Reintentar</button>
        </div> : !progress && <p role="status">Cargando trabajos realizados…</p>}
        <PlanCalendar items={items} groups={sortHealthPlanGroups(items.map(item => item.animal_group))}
          progress={progress}/>
      </>}
    <section className="cria-missing-results">
      <h3>Últimas jornadas vinculadas al plan</h3>
      {usesError ? <div className="data-error" role="alert">No pudimos cargar las jornadas vinculadas.
        <button type="button" className="secondary-button" onClick={() => retry(value => value + 1)}>Reintentar</button>
      </div> : !uses ? <p role="status">Cargando jornadas…</p> : !uses.length ? <p>Todavía no hay jornadas vinculadas al plan.</p>
        : <div className="table-wrap"><table className="data-table" aria-label="Jornadas vinculadas al plan sanitario">
          <thead><tr><th scope="col">Fecha</th><th scope="col">Trabajo</th><th scope="col">CSV de origen</th></tr></thead>
          <tbody>{uses.map(use => <tr key={use.id}><td>{formatLivestockDate(use.date)}</td>
            <td>{[use.group, use.name].filter(Boolean).join(" · ")}</td><td>{use.filename}</td></tr>)}</tbody>
        </table></div>}
    </section>
  </div>
}
