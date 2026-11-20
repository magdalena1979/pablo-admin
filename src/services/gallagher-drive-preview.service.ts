import { supabase } from "@/lib/supabase"
import { clientsService } from "@/services/clients.service"
import { parseCsvFile } from "@/features/livestock/import-engine/parser"
import { csvReadings, matchReadings, type CsvReading, type KnownAnimal, type RegisteredTag, type MatchedReading } from "@/features/livestock/drive-matching"
import { listDriveCsvFiles, downloadDriveCsv, type DriveCsvFile } from "./google-drive-read.service"

export interface DriveFileReview { file: DriveCsvFile; hash: string; rows: MatchedReading[]; error: string; empty: boolean }
const one = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value
const chunks = <T,>(values: T[], size: number): T[][] => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size))

export async function reviewGallagherDrive(signal: AbortSignal, progress: (text: string) => void): Promise<DriveFileReview[]> {
  if (!supabase) throw new Error("Supabase no está configurado.")
  progress("Conectando con Drive…")
  const { files, bearer } = await listDriveCsvFiles(signal)
  const clients = await clientsService.list()
  const pending: Array<{ file: DriveCsvFile; hash: string; readings: CsvReading[]; error: string; empty: boolean }> = []
  let totalBytes = 0
  for (const [index, file] of files.entries()) {
    signal.throwIfAborted()
    progress(`Leyendo ${index + 1} de ${files.length}: ${file.name}`)
    try {
      if (totalBytes + Number(file.size ?? 0) > 20 * 1024 * 1024) throw new Error("La carpeta supera los 20 MB de CSV por revisión.")
      const csv = await downloadDriveCsv(file, bearer, signal); totalBytes += csv.size
      if (totalBytes > 20 * 1024 * 1024) throw new Error("La carpeta supera los 20 MB de CSV por revisión.")
      const parsed = await parseCsvFile(csv)
      pending.push({ file, hash: parsed.hash, readings: csvReadings(parsed.headers, parsed.rows), error: "", empty: false })
    } catch (cause) {
      signal.throwIfAborted()
      const message = cause instanceof Error ? cause.message : "No pudimos leer el archivo."
      const empty = message === "El CSV no contiene filas de datos."
      pending.push({ file, hash: "", readings: [], error: empty ? "" : message, empty })
    }
  }
  progress("Buscando las caravanas registradas y sus clientes…")
  const registrations = new Map(clients.flatMap(client => client.farms.flatMap(farm => farm.renspas.map(renspa => [renspa.id, { client: client.legalName, farm: farm.name, farmId: farm.id, renspa: renspa.number, renspaId: renspa.id }] as const))))
  const eids = [...new Set(pending.flatMap(file => file.readings.map(row => row.eid)).filter(eid => /^\d{15}$/.test(eid)))]
  const stock: RegisteredTag[] = []
  for (const ids of chunks(eids, 200)) {
    const { data, error } = await supabase.from("ear_tags").select("electronic_id,status,ear_tag_ranges(target_sex,ear_tag_receipts(renspa_id))").in("electronic_id", ids).abortSignal(signal)
    if (error) throw error
    for (const row of data ?? []) {
      const range = one(row.ear_tag_ranges), receipt = one(range?.ear_tag_receipts ?? null)
      const related = receipt ? registrations.get(receipt.renspa_id) : undefined
      stock.push({ eid: row.electronic_id, status: row.status, sex: range?.target_sex ?? "", client: "", farm: "", farmId: "", renspa: "", renspaId: "", ...related })
    }
  }
  const animals = new Map<string, KnownAnimal>()
  const visualTags = [...new Set(pending.flatMap(file => file.readings.map(row => row.tag)).filter(Boolean))]
  for (const [field, values] of [["electronic_id", eids], ["tag_number", visualTags]] as const) {
    for (const ids of chunks(values, 200)) {
      let offset = 0, more = true
      while (more) {
        const { data, error } = await supabase.from("animals").select("id,electronic_id,farm_id,tag_number,sex,active,status").in(field, ids).order("id").range(offset, offset + 999).abortSignal(signal)
        if (error) throw error
        for (const row of data ?? []) animals.set(row.id, { electronicId: row.electronic_id ?? "", farmId: row.farm_id, tag: row.tag_number, sex: row.sex, active: row.active, status: row.status })
        more = (data?.length ?? 0) === 1000; offset += 1000
      }
    }
  }
  return pending.map(file => ({ file: file.file, hash: file.hash, error: file.error, empty: file.empty, rows: matchReadings(file.readings, stock, [...animals.values()]) }))
}
