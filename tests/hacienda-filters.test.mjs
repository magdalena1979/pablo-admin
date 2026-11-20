import test from "node:test"
import assert from "node:assert/strict"
import { filterHacienda, haciendaFilterOptions, emptyHaciendaFilters } from "../src/features/livestock/hacienda-filters.ts"

const base={tagNumber:"1857",electronicId:"032010006501857",electronicIdRaw:null,sex:"macho",breed:null,status:"activo",categoryName:null,herdName:null,lastEvent:"lectura",lastEventDate:null}
const animals=[
  {...base,id:"a1",clientId:"c1",clientName:"Marina",farmId:"f1",farmName:"San Ignacio",renspas:[{id:"r1",number:"01111000230/02"}]},
  {...base,id:"a2",clientId:"c1",clientName:"Marina",farmId:"f1",farmName:"San Ignacio",tagNumber:"1858",renspas:[{id:"r2",number:"OTRO-RENSPA"}]},
  {...base,id:"a3",clientId:"c1",clientName:"Marina",farmId:"f2",farmName:"Segundo campo",renspas:[{id:"r3",number:"RENSPA-3"}]},
  {...base,id:"a4",clientId:"c2",clientName:"José",farmId:"f3",farmName:"San Ignacio",renspas:[{id:"r4",number:"RENSPA-4"}]},
  {...base,id:"a5",clientId:"c2",clientName:"José",farmId:"f3",farmName:"San Ignacio",renspas:[]},
]
const filtered=patch=>filterHacienda(animals,{...emptyHaciendaFilters,...patch}).map(row=>row.id)
test("client and farm filters use IDs, including identically named establishments",()=>{
  assert.deepEqual(filtered({clientId:"c1"}),["a1","a2","a3"])
  assert.deepEqual(filtered({farmId:"f3"}),["a4","a5"])
  assert.deepEqual(filtered({clientId:"c1",farmId:"f3"}),[])
})
test("a RENSPA filter selects actual tag links without inferring from the farm",()=>{
  assert.deepEqual(filtered({renspaId:"r4"}),["a4"])
  assert.deepEqual(filtered({clientId:"c1",farmId:"f1",renspaId:"r2"}),["a2"])
})
test("text search combines with ownership filters and ignores accents",()=>{
  assert.deepEqual(filtered({query:"jose",farmId:"f3"}),["a4","a5"])
  assert.deepEqual(filtered({query:"OTRO-RENSPA"}),["a2"])
  assert.deepEqual(filtered({query:"1858",clientId:"c1"}),["a2"])
  assert.deepEqual(filtered({query:"sin asignar"}),[])
})
test("filter options cascade and distinguish duplicate establishment names",()=>{
  const all=haciendaFilterOptions(animals,{clientId:"",farmId:""})
  assert.equal(all.clients.length,2);assert.equal(all.farms.length,3)
  assert.ok(all.farms.find(row=>row.id==="f1").label.includes("Marina"))
  assert.ok(all.farms.find(row=>row.id==="f3").label.includes("José"))
  const scoped=haciendaFilterOptions(animals,{clientId:"c1",farmId:"f1"})
  assert.deepEqual(scoped.renspas.map(row=>row.id).sort(),["r1","r2"])
  assert.deepEqual(scoped.farms.map(row=>row.id).sort(),["f1","f2"])
})
test("multiple linked RENSPA retain one animal and no-link animals remain visible",()=>{
  const multi={...animals[0],renspas:[...animals[0].renspas,...animals[1].renspas]}
  assert.equal(filterHacienda([multi],{...emptyHaciendaFilters,renspaId:"r2"}).length,1)
  assert.equal(filterHacienda(animals,emptyHaciendaFilters).length,5)
  const before=structuredClone(animals)
  haciendaFilterOptions(animals,{clientId:"c1",farmId:""});filtered({query:"San Ignacio"})
  assert.deepEqual(animals,before)
})
