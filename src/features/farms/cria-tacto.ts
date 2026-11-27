import type { HistoryEntry } from "../livestock/animal-history"

export type TactoResult = "prenada" | "vacia" | "pendiente"

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
}

export function gestationResult(gestation: string): TactoResult {
  const label = normalize(gestation)
  if (label === "vacia") return "vacia"
  if (["cabeza", "cuerpo", "cola", "prenada"].includes(label)) return "prenada"
  return "pendiente"
}

export function summarizeTacto(readings: {
  animalId: string
  tag: string
  eid: string | null
  gestation: string
  bleeding?: string
}[]) {
  const byAnimal = new Map<string, { tag: string; eid: string | null; results: Set<TactoResult>; values: Set<string>; bleeding: Set<string> }>()
  for (const reading of readings) {
    const animal = byAnimal.get(reading.animalId) ?? {
      tag: reading.tag, eid: reading.eid, results: new Set<TactoResult>(), values: new Set<string>(), bleeding: new Set<string>(),
    }
    const value = reading.gestation.trim()
    if (value) {
      animal.values.add(value)
      animal.results.add(gestationResult(value))
    }
    if (reading.bleeding?.trim()) animal.bleeding.add(normalize(reading.bleeding))
    byAnimal.set(reading.animalId, animal)
  }
  const results = { prenada: [], vacia: [], pendiente: [], sangrado: [] } as Record<TactoResult | "sangrado", {
    id: string; tag: string; eid: string | null; recorded: string
  }[]>
  for (const [id, animal] of byAnimal) {
    const result = animal.results.size === 1 ? [...animal.results][0] : "pendiente"
    const row = { id, tag: animal.tag, eid: animal.eid, recorded: [...animal.values].join(" · ") }
    results[result].push(row)
    if (animal.bleeding.size === 1 && animal.bleeding.has("yes")) {
      results.sangrado.push({ ...row, recorded: "SANGRADO.BRUCEIOSIS = Yes" })
    }
  }
  for (const group of Object.values(results)) group.sort((a, b) => a.tag.localeCompare(b.tag, "es", { numeric: true }))
  return results
}

function readField(raw: Record<string, unknown> | null | undefined, key: string) {
  const value = Object.entries(raw ?? {}).find(([field]) => normalize(field) === key)?.[1]
  return typeof value === "string" ? value.trim() : ""
}

export function readGestation(raw: Record<string, unknown> | null | undefined) {
  return readField(raw, "gestacion")
}

export function readBrucellosisBleeding(raw: Record<string, unknown> | null | undefined) {
  return readField(raw, "sangrado.bruceliosis") || readField(raw, "sangrado.bruceiosis")
}

export function summarizeCsvObservations(rawRows: Record<string, string>[]) {
  const counts = { prenada: 0, vacia: 0, pendiente: 0, sangrado: 0 }
  for (const row of rawRows) {
    const gestation = readGestation(row)
    if (gestation) counts[gestationResult(gestation)]++
    if (normalize(readBrucellosisBleeding(row)) === "yes") counts.sangrado++
  }
  return counts
}

const gestationLabels: Record<TactoResult, string> = {
  prenada: "Preñada",
  vacia: "Vacía",
  pendiente: "Por revisar",
}

export function reproductiveHistory(entries: HistoryEntry[]) {
  const history = entries.flatMap(entry => {
    if (!entry.csvDate || entry.source.toLowerCase() !== "gallagher") return []
    const gestation = readGestation(entry.fields)
    const bleeding = readBrucellosisBleeding(entry.fields)
    const normalizedBleeding = normalize(bleeding)
    const common = { date: entry.csvDate, filename: entry.filename }
    return [
      ...(gestation ? [{ ...common, id: entry.id + ":tacto", type: "Tacto",
        result: gestationLabels[gestationResult(gestation)], original: gestation }] : []),
      ...(bleeding ? [{ ...common, id: entry.id + ":sangrado", type: "Sangrado para brucelosis",
        result: normalizedBleeding === "yes" ? "Muestra tomada" :
          normalizedBleeding === "no" ? "Marcado como no" : "Por revisar",
        original: bleeding }] : []),
    ]
  })
  return history.sort((a, b) => b.date.localeCompare(a.date))
}

export async function latestTactoWithResults<T>(
  sessions: readonly T[],
  load: (session: T) => Promise<ReturnType<typeof summarizeTacto>>,
) {
  let fallback: { session: T; data: ReturnType<typeof summarizeTacto> } | null = null
  for (const session of sessions) {
    const data = await load(session)
    if (data.vacia.length || data.prenada.length) return { session, data }
    fallback ??= { session, data }
  }
  return fallback
}

export interface CsvHealthMark {
  type: "sangrado" | "atosa"
  original: string
}

export function csvHealthMarks(raw: Record<string, unknown> | null | undefined): CsvHealthMark[] {
  const bleeding = readBrucellosisBleeding(raw)
  const atosa = readField(raw, "atosa.clost.repro.co")
  const marks: CsvHealthMark[] = []
  if (normalize(bleeding) === "yes") marks.push({ type: "sangrado", original: bleeding })
  if (atosa) marks.push({ type: "atosa", original: atosa })
  return marks
}
