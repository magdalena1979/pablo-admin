import type { CsvFileReview } from "../../services/gallagher-csv-preview.service"
import type { CsvConfirmationResult } from "../../services/gallagher-csv-confirm.service"

export function eligibleCsvBatch(files:CsvFileReview[],confirmed:Record<string,CsvConfirmationResult>,errors:Record<string,string>={}){
  const seen=new Set<string>()
  return files.filter(file=>{
    if(confirmed[file.hash]||file.confirmation||errors[file.file.id]||csvConfirmationBlocker(file)||seen.has(file.hash))return false
    seen.add(file.hash);return true
  })
}

export function csvConfirmationBlocker(review: CsvFileReview): string {
  if (review.error) return review.error
  if (review.empty || !review.rows.length) return "El CSV no contiene registros para vincular."
  if (review.rows.length > 10000) return "Podés confirmar hasta 10000 lecturas por archivo."
  if (review.rows.some(row => row.result !== "coincidencia")) return "Resolvé los conflictos y las caravanas sin alta previa antes de confirmar este archivo."
  if (!/^[a-f0-9]{64}$/.test(review.hash)) return "Falta el hash del archivo. Volvé a seleccionarlo."
  if (review.rows.some(row => !row.registration?.clientId || !row.registration?.farmId || !row.registration?.renspaId)) return "No se pudo validar la pertenencia. Volvé a revisar el CSV."
  if (review.rows.some(row => !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !validDate(row.date) || (row.time && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(row.time)))) return "Hay fechas u horas inválidas. Se espera fecha AAAA-MM-DD y hora HH:MM[:SS]."
  return ""
}
function validDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value
}
export function csvConfirmationPayload(review: CsvFileReview) {
  const blocker = csvConfirmationBlocker(review)
  if (blocker) throw new Error(blocker)
  return { p_filename: review.file.name, p_file_hash: review.hash, p_headers: review.headers,
    p_rows: review.rows.map(row => {
      const rawCsv = review.rawRows[row.row - 2]
      if (!rawCsv) throw new Error("Faltan datos originales de una fila. Volvé a seleccionar el CSV.")
      const noteHeader = review.headers.find(header => ["notas","notes","observaciones"].includes(header.toLocaleLowerCase("es-AR").trim()))
      return { row: row.row, eid: row.eid, tag: row.tag, date: row.date, time: row.time, sex: row.sex,
        notes: noteHeader ? rawCsv[noteHeader] ?? "" : "", rawCsv,
        expectedClientId: row.registration!.clientId!, expectedFarmId: row.registration!.farmId,
        expectedRenspaId: row.registration!.renspaId, expectedSex: row.registration!.sex }
    }) }
}
