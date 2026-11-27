import { useEffect, useState } from "react"
import { CriaOverview } from "./CriaOverview"
import { AppSelect } from "@/components/ui/AppSelect"
import { supabase } from "@/lib/supabase"
import type { OverviewAnimal } from "@/services/livestock-registry.service"
import { formatLivestockDate } from "./livestock-date"
import { livestockActivityLabels, type LivestockActivity, type LivestockProfile } from "./livestock-profile"

import { summarizeWeighings, type Weighing } from "./livestock-weighings"

const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 })
const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" })

async function loadWeighings(farmId: string, signal: AbortSignal) {
  if (!supabase) throw new Error("Supabase no está configurado.")
  const weighings: Weighing[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("animal_events")
      .select("animal_id,event_date,metadata").eq("farm_id", farmId).eq("event_type", "pesaje")
      .is("voided_at", null).order("event_date", { ascending: false }).order("id").range(offset, offset + 999).abortSignal(signal)
    if (error) throw error
    for (const row of data ?? []) {
      const kg = Number(row.metadata?.weight_kg)
      const date = new Date(row.event_date)
      if (Number.isFinite(kg) && kg > 0 && Number.isFinite(date.getTime())) {
        weighings.push({ animalId: row.animal_id, date: localDate.format(date), kg })
      }
    }
    if ((data?.length ?? 0) < 1000) return weighings
  }
}

export function LivestockOverview({ farmId, renspaId, profile, rows, animalsError, onRetryAnimals, worksUrl }: {
  farmId: string
  renspaId: string
  profile: LivestockProfile
  rows: OverviewAnimal[] | null
  animalsError: string
  onRetryAnimals: () => void
  worksUrl: string
}) {
  const [chosen, setChosen] = useState<LivestockActivity | null>(null)
  const activity = chosen && profile.activities.includes(chosen) ? chosen : profile.primary
  const growth = activity === "recria" || activity === "terminacion"
  const [weighings, setWeighings] = useState<Weighing[]>([])
  const [loading, setLoading] = useState(growth)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!growth || !rows) return
    let active = true
    const controller = new AbortController()
    const timeout = AbortSignal.timeout(15_000)
    setLoading(true)
    setError(false)
    void loadWeighings(farmId, AbortSignal.any([controller.signal, timeout])).then(rows => { if (active) setWeighings(rows) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [farmId, growth, rows !== null])

  const groups = new Map<string | null, OverviewAnimal[]>()
  for (const row of rows ?? []) {
    const group = groups.get(row.herdName) ?? []
    group.push(row)
    groups.set(row.herdName, group)
  }

  return <section className="livestock-overview">
    {profile.activities.length > 1 && <div className="hacienda-activity-picker"><AppSelect aria-label="Actividad ganadera" value={activity ?? ""}
        onChange={event => setChosen(profile.activities.find(item => item === event.target.value) ?? null)}>
        {profile.activities.map(item => <option key={item} value={item}>{livestockActivityLabels[item]}</option>)}
      </AppSelect></div>}
    <h2>{activity && livestockActivityLabels[activity]}</h2>
    {!growth && <CriaOverview key={renspaId} farmId={farmId} renspaId={renspaId} worksUrl={worksUrl}/>}
    {rows && growth && loading && <p role="status">Cargando pesajes…</p>}
    {growth && error && <p role="alert">No se pudieron cargar los pesajes.</p>}
    {growth && (animalsError ? <div className="data-error" role="alert">
      {animalsError}<button type="button" className="secondary-button" onClick={onRetryAnimals}>Reintentar</button>
    </div> : !rows ? <p role="status">Cargando rodeos…</p> : <div className="panel data-panel"><div className="table-wrap">
      <table className="data-table">
        <thead><tr><th scope="col">{growth ? "Tropa / rodeo" : "Rodeo"}</th><th scope="col">Animales registrados</th>
          {growth && <><th scope="col">Último pesaje</th><th scope="col">Ganancia diaria (kg/día)</th></>}
        </tr></thead>
        <tbody>
          {[...groups].map(([name, animals]) => {
            const weights = growth && name !== null && !loading && !error
              ? summarizeWeighings(new Set(animals.map(animal => animal.id)), weighings) : null
            return <tr key={name === null ? "unassigned" : "herd-" + name}>
              <td>{name ?? "Sin rodeo asignado"}</td><td>{animals.length}</td>
              {growth && <>
                <td>{weights ? <>{number.format(weights.average)} kg · {formatLivestockDate(weights.date)}<br/>
                  <small>{weights.weighed} de {animals.length} pesados</small></> : "—"}</td>
                <td>{weights && weights.previousDate && weights.gain !== null ? <>{number.format(weights.gain)}<br/>
                  <small>{weights.paired} de {animals.length} con dos pesajes · {formatLivestockDate(weights.previousDate)} al {formatLivestockDate(weights.date)}</small></> : "—"}</td>
              </>}
            </tr>
          })}
          {!groups.size && <tr><td colSpan={growth ? 4 : 2}>Todavía no hay animales registrados para esta selección.</td></tr>}
        </tbody>
      </table>
    </div></div>)}
  </section>
}
