import test from "node:test"
import assert from "node:assert/strict"
import { parseCsvFile } from "../src/features/livestock/import-engine/parser.ts"
import { csvReadings, matchReadings } from "../src/features/livestock/drive-matching.ts"

test("local Gallagher CSV matches the six preregistered tags without Drive", async () => {
  const stock = Array.from({ length: 6 }, (_, index) => ({
    eid: (32010006501857n + BigInt(index)).toString().padStart(15, "0"),
    status: "disponible", sex: "macho", client: "Cliente de prueba", farm: "San Ignacio", farmId: "farm-a", renspa: "01111000230/02", renspaId: "renspa-a",
  }))
  const csv = ["Número de etiqueta,ID electrónico,Fecha,Time,Notas", ...stock.map((tag, index) => `${1857 + index},${tag.eid.slice(0, 3)} ${tag.eid.slice(3)},2025-05-10,11:35:00,`)].join("\r\n")
  const parsed = await parseCsvFile(new File([csv], "2025-05-10 TOROS 2.csv", { type: "text/csv" }))
  const result = matchReadings(csvReadings(parsed.headers, parsed.rows), stock, [])
  assert.equal(parsed.hash.length, 64)
  assert.equal(result.length, 6)
  assert.ok(result.every(row => row.result === "coincidencia" && row.registration.farmId === "farm-a"))
})
test("semicolon CSV and quoted commas preserve identity and notes", async () => {
  const csv = '\uFEFFNúmero de etiqueta;ID electrónico;Fecha;Time;Notas\n1857;032 010006501857;2025-05-10;11:35:00;"nota, sin inferir"'
  const parsed = await parseCsvFile(new File([csv], "sesion.csv"))
  assert.equal(parsed.delimiter, ";")
  assert.equal(parsed.rows[0].Notas, "nota, sin inferir")
  assert.equal(csvReadings(parsed.headers, parsed.rows)[0].eid, "032010006501857")
})
test("empty and ambiguous local CSV files never produce accepted matches", async () => {
  await assert.rejects(() => parseCsvFile(new File(["EID,Date\n"], "vacio.csv")), /no contiene filas/)
  await assert.rejects(() => parseCsvFile(new File(["EID,EID\n1,2"], "duplicado.csv")), /encabezados duplicados/)
})
