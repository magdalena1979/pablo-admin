import test from "node:test"
import assert from "node:assert/strict"
import { eligibleCsvBatch } from "../src/features/livestock/csv-confirmation.ts"
import { runCsvBatch } from "../src/features/livestock/csv-batch.ts"

function file(letter){return{
  file:{id:letter,name:`${letter}.csv`,size:100},hash:letter.repeat(64),headers:["ID electrónico"],rawRows:[{"ID electrónico":"032010006501857"}],empty:false,error:"",
  rows:[{row:2,eid:"032010006501857",tag:"1857",date:"2025-05-10",time:"11:35:00",sex:"",error:"",result:"coincidencia",detail:"",registration:{clientId:"client",farmId:"farm",renspaId:"renspa",sex:"macho"}}],
}}
const result=()=>({confirmation_id:"confirmation",already_imported:false,readings:1,animals:1,created:1,existing:0,tags_used:1,sessions:[]})
function callbacks(overrides={}){return{confirm:async()=>result(),progress:()=>{},success:()=>{},failure:()=>{},shouldStop:()=>false,...overrides}}
test("batch includes unique ready files only; imported, empty and conflicted CSV stay excluded",()=>{
  const ready=file("a"),done={...file("b"),confirmation:result()},empty={...file("c"),rows:[],empty:true},conflict=file("d")
  conflict.rows[0].result="sin_alta"
  const duplicate={...ready,file:{...ready.file,id:"duplicate"}},bad={...file("e"),error:"CSV inválido"},failed=file("f")
  const eligible=eligibleCsvBatch([ready,done,empty,conflict,duplicate,bad,failed],{},{f:"Error al guardar"})
  assert.deepEqual(eligible.map(item=>item.file.id),["a"])
  assert.deepEqual(eligibleCsvBatch([ready],{[ready.hash]:result()}),[])
})
test("batch processes sequentially and reports progress and saved/already-imported separately",async()=>{
  const calls=[],progress=[],success=[];let running=0
  const report=await runCsvBatch([file("a"),file("b")],callbacks({
    confirm:async current=>{assert.equal(running,0);running++;calls.push(current.file.id);await Promise.resolve();running--;return{...result(),already_imported:current.file.id==="b"}},
    progress:(current,index,total)=>progress.push([current.file.id,index,total]),success:current=>success.push(current.file.id),
  }))
  assert.deepEqual(calls,["a","b"]);assert.deepEqual(success,["a","b"])
  assert.deepEqual(progress,[["a",1,2],["b",2,2]])
  assert.deepEqual(report,{saved:1,alreadyImported:1,failed:0,pending:0,stopped:false})
})
test("a server-side business conflict reports its file and continues to independent files",async()=>{
  const saved=[],errors=[]
  const report=await runCsvBatch([file("a"),file("b"),file("c")],callbacks({
    confirm:async current=>{if(current.file.id==="b")throw Object.assign(new Error("Conflicto de sexo"),{code:"P0001"});return result()},
    success:current=>saved.push(current.file.id),failure:(current,message)=>errors.push([current.file.id,message]),
  }))
  assert.deepEqual(saved,["a","c"]);assert.deepEqual(errors,[["b","Conflicto de sexo"]])
  assert.deepEqual(report,{saved:2,alreadyImported:0,failed:1,pending:0,stopped:false})
})
test("connection or permission failure stops new requests without undoing saved files",async()=>{
  const saved=[],calls=[]
  const report=await runCsvBatch([file("a"),file("b"),file("c")],callbacks({
    confirm:async current=>{calls.push(current.file.id);if(current.file.id==="b")throw new Error("Sin conexión");return result()},success:current=>saved.push(current.file.id),
  }))
  assert.deepEqual(calls,["a","b"]);assert.deepEqual(saved,["a"])
  assert.deepEqual(report,{saved:1,alreadyImported:0,failed:1,pending:1,stopped:true})
})
test("stop waits for the current file to finish and leaves remaining files pending",async()=>{
  let stop=false;const completed=[]
  const report=await runCsvBatch([file("a"),file("b")],callbacks({confirm:async()=>{stop=true;return result()},shouldStop:()=>stop,success:current=>completed.push(current.file.id)}))
  assert.deepEqual(completed,["a"])
  assert.deepEqual(report,{saved:1,alreadyImported:0,failed:0,pending:1,stopped:true})
})
