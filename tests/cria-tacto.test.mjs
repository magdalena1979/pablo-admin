import test from "node:test"
import assert from "node:assert/strict"
import { csvHealthMarks, latestTactoWithResults, readGestation, reproductiveHistory, summarizeCsvObservations, summarizeTacto } from "../src/features/farms/cria-tacto.ts"

const reading = (animalId, gestation) => ({ animalId, tag: animalId, eid: null, gestation })

test("tacto uses explicit Gallagher values and keeps other values for review", () => {
  const result = summarizeTacto(["VACÍA", "CABEZA", "cuerpo", "cola", "", "sin dato"].map((value, index) => reading(String(index), value)))
  assert.deepEqual(result.vacia.map(row => row.id), ["0"])
  assert.deepEqual(result.prenada.map(row => row.id), ["1", "2", "3"])
  assert.deepEqual(result.pendiente.map(row => row.recorded), ["", "sin dato"])
  assert.equal(readGestation({ "Gestación": "VACIA", Notes: "preñada" }), "VACIA")
  assert.equal(readGestation({ Notes: "VACIA" }), "")
})

test("counts each animal once and puts conflicting results in pending", () => {
  const result = summarizeTacto([reading("1", "VACIA"), reading("1", ""), reading("2", "VACIA"), reading("2", "CABEZA")])
  assert.equal(result.vacia.length, 1)
  assert.equal(result.prenada.length, 0)
  assert.deepEqual(result.pendiente.map(row => row.recorded), ["VACIA · CABEZA"])
})

test("a reading can contribute a pregnancy result and a blood sample independently", () => {
  const review = summarizeCsvObservations([
    { GESTACION: "cuerpo", "SANGRADO.BRUCEIOSIS": "Yes", "ATOSA.CLOST.REPRO.CO": "Yes" },
    { GESTACION: "VACIA", "SANGRADO.BRUCEIOSIS": "No" },
    { "ATOSA.CLOST.REPRO.CO": "Yes" },
  ])
  assert.deepEqual(review, { prenada: 1, vacia: 1, pendiente: 0, sangrado: 1 })
  const result = summarizeTacto([
    { ...reading("1", "cola"), bleeding: "Yes" },
    { ...reading("1", "CABEZA"), bleeding: "Yes" },
    { ...reading("2", "VACIA"), bleeding: "Yes" },
    { ...reading("2", "VACIA"), bleeding: "No" },
  ])
  assert.deepEqual(result.prenada.map(row => row.id), ["1"])
  assert.deepEqual(result.vacia.map(row => row.id), ["2"])
  assert.deepEqual(result.sangrado.map(row => row.id), ["1"])
})

test("animal history lists separate observations with source date and CSV for old imports", () => {
  const base = { date: "2026-09-26T00:00:00Z", title: "Lectura registrada", filename: "SAN IGNACIO.csv", source: "gallagher" }
  const history = reproductiveHistory([
    { ...base, id: "old", csvDate: "2025-04-23", fields: { GESTACION: "VACIA" } },
    { ...base, id: "new", csvDate: "2026-09-25", fields: { GESTACION: "cola", "SANGRADO.BRUCEIOSIS": "Yes" } },
    { ...base, id: "name-only", csvDate: "2026-09-25", filename: "TACTO Y SANGRADO.csv", fields: {} },
    { ...base, id: "technical-event", fields: { GESTACION: "cola" } },
  ])
  assert.deepEqual(history.map(row => [row.date, row.type, row.result, row.original, row.filename]), [
    ["2026-09-25", "Tacto", "Preñada", "cola", "SAN IGNACIO.csv"],
    ["2026-09-25", "Sangrado para brucelosis", "Muestra tomada", "Yes", "SAN IGNACIO.csv"],
    ["2025-04-23", "Tacto", "Vacía", "VACIA", "SAN IGNACIO.csv"],
  ])
})

test("default tacto skips newer sessions without interpretable gestation", async () => {
  const sessions = ["2026-11-12", "2026-11-05", "2026-09-25", "2026-02-20"]
  const visited = []
  const good = summarizeTacto(Array.from({ length: 11 }, (_, index) => reading(String(index), "VACIA")))
  const selected = await latestTactoWithResults(sessions, async session => {
    visited.push(session)
    return session === "2026-09-25" ? good : summarizeTacto([reading("1", "")])
  })
  assert.equal(selected.session, "2026-09-25")
  assert.equal(selected.data.vacia.length, 11)
  assert.deepEqual(visited, sessions.slice(0, 3))
})

test("when no tacto has results the latest session remains available", async () => {
  const selected = await latestTactoWithResults(["latest", "older"], async () => summarizeTacto([]))
  assert.equal(selected.session, "latest")
  assert.equal(await latestTactoWithResults([], async () => summarizeTacto([])), null)
})

test("sanidad uses affirmative bleeding records and keeps ATOSA as a raw mark", () => {
  assert.deepEqual(csvHealthMarks({
    "SANGRADO.BRUCEIOSIS": "Yes", "ATOSA.CLOST.REPRO.CO": "No", GESTACION: "VACIA",
  }), [
    { type: "sangrado", original: "Yes" },
    { type: "atosa", original: "No" },
  ])
  assert.deepEqual(csvHealthMarks({ "SANGRADO.BRUCEIOSIS": "No", Notes: "sangrado", Drenched: "12-05-2026" }), [])
})
