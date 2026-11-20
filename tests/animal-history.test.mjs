import test from 'node:test'
import assert from 'node:assert/strict'
import { recordedFields, latestRecorded } from '../src/features/livestock/animal-history.ts'
test('raw traits exclude identifiers and empty values while retaining explicit No and zero',()=>{
 assert.deepEqual(recordedFields({'Número de etiqueta':'1861','ID electrónico':'032010006501861',Fecha:'2025-05-10',Time:'11:46:27',Notas:'nota',APLOMO:'No',Condition:0,GESTACION:'',edad:'bll',nested:{x:1}}),{APLOMO:'No',Condition:'0',edad:'bll'})
})
test('latest recorded values retain their actual dates and origins when newer readings omit fields',()=>{
 const entries=[{id:'old',date:'2025-05-10T11:46:27Z',filename:'TOROS 2.csv',fields:{edad:'bll',APLOMO:'Yes'}},{id:'new',date:'2025-08-15T10:30:13Z',filename:'raspaje.csv',fields:{edad:'',APLOMO:'No'}}]
 const latest=latestRecorded(entries)
 assert.deepEqual(latest.find(row=>row.field==='edad'),{field:'edad',value:'bll',date:entries[0].date,filename:'TOROS 2.csv'})
 assert.equal(latest.find(row=>row.field==='APLOMO').value,'No')
 assert.equal(entries[0].id,'old')
})
