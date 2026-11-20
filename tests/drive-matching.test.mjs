import test from "node:test"
import assert from "node:assert/strict"
import { csvReadings, matchReadings } from "../src/features/livestock/drive-matching.ts"

const first = "032010006501857"
const headers = ["Número de etiqueta", "ID electrónico", "Fecha", "Time", "Sexo"]
const csvRow = (eid = first, tag = "1857", sex = "") => ({ "Número de etiqueta": tag, "ID electrónico": eid, Fecha: "2025-05-10", Time: "11:35:00", Sexo: sex })
const registration = { eid: first, status: "disponible", sex: "macho", client: "Cliente de prueba", farm: "San Ignacio", farmId: "farm-a", renspa: "01111000230/02", renspaId: "renspa-a" }
const reading = () => csvReadings(headers, [csvRow()])[0]
const animal = { electronicId: first, farmId: "farm-a", tag: "1857", sex: "macho", active: true }

test("Spanish export headers preserve EID zeros and date/time separately", () => {
  const [row] = csvReadings(headers, [csvRow("032 010006501857")])
  assert.equal(row.eid, first)
  assert.equal(row.time, "11:35:00")
  assert.equal(row.date, "2025-05-10")
})
test("English aliases and explicit sex values are recognized", () => {
  const [row] = csvReadings(["EID", "Tag Number", "Date", "Time", "Sex"], [{ EID: first, "Tag Number": "1857", Date: "2025-05-10", Time: "11:35:00", Sex: "Male" }])
  assert.equal(row.sex, "macho")
  assert.equal(row.tag, "1857")
})
test("TOROS 2 six EIDs resolve only to registered owners; no filename inference", () => {
  const tags = Array.from({ length: 6 }, (_, index) => ({ ...registration, eid: (BigInt(first) + BigInt(index)).toString().padStart(15, "0") }))
  const rows = csvReadings(headers, tags.map((tag, index) => csvRow(tag.eid, String(1857 + index))))
  const matched = matchReadings(rows, tags, [])
  assert.equal(matched.filter(row => row.result === "coincidencia").length, 6)
  assert.ok(matched.every(row => row.registration.farm === "San Ignacio"))
  assert.ok(matched.every(row => row.registration.renspa === registration.renspa))
})
test("ownership resolves per EID across clients and RENSPA", () => {
  const other = { ...registration, eid: "032010006501858", client: "Otro cliente", farm: "Otro campo", farmId: "farm-b", renspa: "otro", renspaId: "renspa-b" }
  const rows = csvReadings(headers, [csvRow(), csvRow(other.eid, "1858")])
  const result = matchReadings(rows, [registration, other], [])
  assert.equal(result[0].registration.client, "Cliente de prueba")
  assert.equal(result[1].registration.renspaId, "renspa-b")
})
test("unregistered and malformed EIDs remain unresolved", () => {
  assert.equal(matchReadings([reading()], [], [animal])[0].result, "sin_alta")
  const malformed = csvReadings(headers, [csvRow("032-X")])
  assert.equal(matchReadings(malformed, [], [])[0].result, "error")
})
test("stock/CSV/animal sex conflicts never overwrite either side", () => {
  const rows = csvReadings(headers, [csvRow(first, "1857", "Female")])
  const snapshot = structuredClone(registration)
  assert.equal(matchReadings(rows, [registration], [])[0].result, "conflicto")
  assert.equal(matchReadings([reading()], [registration], [{ ...animal, sex: "hembra" }])[0].result, "conflicto")
  assert.deepEqual(registration, snapshot)
})
test("visual conflicts, wrong farm, inactive animal and incomplete lineage are flagged", () => {
  for (const changed of [{ ...animal, tag: "9999" }, { ...animal, farmId: "other" }, { ...animal, active: false }, { ...animal, electronicId: "032010006509999" }]) {
    assert.equal(matchReadings([reading()], [registration], [changed])[0].result, "conflicto")
  }
  assert.equal(matchReadings([reading()], [{ ...registration, client: "" }], [])[0].result, "conflicto")
  assert.equal(matchReadings(csvReadings(headers, [csvRow(first, "")]), [registration], [])[0].result, "conflicto")
})
test("repeat file rows are distinct from later readings of same animal", () => {
  const rows = [reading(), reading(), { ...reading(), row: 4, time: "11:36:00" }]
  assert.deepEqual(matchReadings(rows, [registration], []).map(row => row.result), ["coincidencia", "conflicto", "coincidencia"])
})
test("used tags require an existing animal; further sessions can match it", () => {
  const used = { ...registration, status: "utilizada" }
  assert.equal(matchReadings([reading()], [used], [])[0].result, "conflicto")
  assert.equal(matchReadings([reading()], [used], [animal])[0].result, "coincidencia")
})
test("missing or ambiguous identity headers require column review", () => {
  assert.throws(() => csvReadings(["Notes"], []), /EID/)
  assert.throws(() => csvReadings(["EID", "ID electrónico"], []), /única/)
})
