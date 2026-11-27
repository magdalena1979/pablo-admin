import test from "node:test"
import assert from "node:assert/strict"
import { csvConfirmationBlocker, csvConfirmationPayload, csvDestinationBlocker, suggestedCsvSessionType, gallagherSessionTitle } from "../src/features/livestock/csv-confirmation.ts"

function review() {
  return { file:{id:"local-id",name:"TOROS 2.csv",size:500},hash:"a".repeat(64),headers:["ID electrónico","Número de etiqueta","Fecha","Time","Notas","TONO"],
    rawRows:[{"ID electrónico":"032 010006501857","Número de etiqueta":"1857",Fecha:"2025-05-10",Time:"11:35:00",Notas:"Nota original",TONO:"Yes"}],empty:false,error:"",
    rows:[{row:2,eid:"032010006501857",tag:"1857",date:"2025-05-10",time:"11:35:00",sex:"",error:"",result:"coincidencia",detail:"Coincidencia",
      registration:{eid:"032010006501857",status:"disponible",sex:"macho",client:"Cliente Test",clientId:"client-a",farm:"San Ignacio",farmId:"farm-a",renspa:"TEST-1",renspaId:"renspa-a"}}] }
}
test("confirmation preserves original columns, explicit timestamps and ownership snapshot",()=>{
  const file=review(),before=structuredClone(file)
  assert.equal(csvConfirmationBlocker(file),"")
  const payload=csvConfirmationPayload(file)
  assert.equal(payload.p_rows[0].expectedSex,"macho")
  assert.equal(payload.p_rows[0].sex,"")
  assert.equal(payload.p_rows[0].expectedClientId,"client-a")
  assert.equal(payload.p_rows[0].rawCsv.TONO,"Yes")
  assert.equal(payload.p_rows[0].notes,"Nota original")
  assert.equal(payload.p_rows[0].time,"11:35:00")
  assert.deepEqual(file,before)
})
test("any problematic row blocks the complete file, without filtering it out",()=>{
  for(const result of ["conflicto","sin_alta","error"]){
    const file=review();file.rows.push({...file.rows[0],row:3,result})
    assert.throws(()=>csvConfirmationPayload(file),/conflictos/)
  }
})
test("empty files, missing snapshots/hash/raw source and calendar errors cannot be sent",()=>{
  const cases=[
    file=>{file.empty=true},file=>{file.hash=""},file=>{file.rows[0].registration.clientId=""},
    file=>{file.rows[0].date="2025-02-31"},file=>{file.rows[0].time="25:00:00"},file=>{file.rawRows=[]},
  ]
  for(const modify of cases){const file=review();modify(file);assert.throws(()=>csvConfirmationPayload(file))}
})
test("multiple owners are transmitted intact for server-side session separation",()=>{
  const file=review();file.rows.push({...file.rows[0],row:3,eid:"032010006501858",tag:"1858",registration:{...file.rows[0].registration,clientId:"client-b",farmId:"farm-b",renspaId:"renspa-b",sex:"hembra"}})
  file.rawRows.push({...file.rawRows[0],"ID electrónico":"032010006501858","Número de etiqueta":"1858"})
  const payload=csvConfirmationPayload(file)
  assert.equal(payload.p_rows.length,2)
  assert.equal(payload.p_rows[1].expectedRenspaId,"renspa-b")
  assert.equal(payload.p_rows[1].expectedSex,"hembra")
})

test("scoped import checks ownership without reassigning or dropping rows", () => {
  const { rows } = review()
  const before = structuredClone(rows)
  assert.equal(csvDestinationBlocker(rows), "")
  assert.equal(csvDestinationBlocker(rows, { clientId: "client-a", farmId: "farm-a", renspaId: "renspa-a" }), "")
  for (const destination of [{ clientId: "client-b" }, { farmId: "farm-b" }, { renspaId: "renspa-b" }]) {
    assert.match(csvDestinationBlocker(rows, destination), /pertenece a otro destino/)
  }
  assert.deepEqual(rows, before)
})

test("general and client-level review can cover multiple farms of the same client", () => {
  const { rows } = review()
  rows.push({ ...rows[0], registration: { ...rows[0].registration, farmId: "farm-b" } })
  assert.equal(csvDestinationBlocker(rows), "")
  assert.equal(csvDestinationBlocker(rows, { clientId: "client-a" }), "")
  assert.match(csvDestinationBlocker(rows, { farmId: "farm-a" }), /pertenece a otro destino/)
})

test("tacto is suggested by the filename but the confirmed choice controls the payload", () => {
  for (const name of ["2026-09-25 TACTO Y SANGRADO.csv", "TACTO_RODEO_2.csv"]) {
    assert.equal(suggestedCsvSessionType(name), "tacto")
  }
  assert.equal(suggestedCsvSessionType("CONTACTO.csv"), "otro")
  const file = { ...review(), file: { ...review().file, name: "TACTO.csv" } }
  assert.equal(csvConfirmationPayload(file).p_session_type, "otro")
  assert.equal(csvConfirmationPayload({ ...file, sessionType: "tacto" }).p_session_type, "tacto")
})

test("raspaje is suggested and a corrected classification replaces the displayed prefix", () => {
  const filename = "2026-08-28 SEGUNDO RASPAJE TOROS.csv"
  assert.equal(suggestedCsvSessionType(filename), "raspaje_toros")
  assert.equal(suggestedCsvSessionType("TACTO Y RASPAJE.csv"), "otro")
  assert.equal(gallagherSessionTitle("Tacto · " + filename, "raspaje_toros"), "Raspaje de toros · " + filename)
  assert.equal(gallagherSessionTitle("Tacto · " + filename, "otro"), "Otro · " + filename)
  assert.equal(csvConfirmationPayload({ ...review(), sessionType: "raspaje_toros" }).p_session_type, "raspaje_toros")
})

test("sanidad and mixed files need an explicit plan item for every farm", () => {
  const file = review()
  file.rows.push({
    ...file.rows[0], row: 3, eid: "032010006501858", tag: "1858",
    registration: { ...file.rows[0].registration, farmId: "farm-b", renspaId: "renspa-b" },
  })
  file.rawRows.push({ ...file.rawRows[0], "ID electrónico": "032010006501858" })
  for (const type of ["sanidad", "tacto_sanidad"]) {
    file.sessionType = type
    file.healthLinks = { "farm-a": { itemId: "plan-a", allAnimals: false } }
    assert.match(csvConfirmationBlocker(file), /cada establecimiento/)
    file.healthLinks["farm-b"] = { itemId: "plan-b", allAnimals: true }
    const payload = csvConfirmationPayload(file)
    assert.equal(payload.p_session_type, type)
    assert.equal(payload.p_rows.length, 2)
    assert.equal(payload.p_rows[0].rawCsv.TONO, "Yes")
  }
})
