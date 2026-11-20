// Optional PostgreSQL integration test. Uses a temporary PGlite package supplied
// as argv[2]; it never connects to Supabase or writes to the project database.
import { readFile, readdir } from "node:fs/promises"
import { resolve, join } from "node:path"
import { pathToFileURL } from "node:url"
import assert from "node:assert/strict"
import { randomUUID, createHash } from "node:crypto"

if (!process.argv[2]) throw new Error("Indicá la ruta del paquete temporal @electric-sql/pglite.")
const { PGlite } = await import(pathToFileURL(join(resolve(process.argv[2]), "dist/index.js")).href)
const db = new PGlite()
let checks = 0
const admin = randomUUID(), employee = randomUUID()
await db.exec(`
  create role authenticated; create role anon;
  create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema public,auth to authenticated,anon;
  alter default privileges in schema public grant all on tables to authenticated;
  alter default privileges in schema public grant all on sequences to authenticated;
`)
try {
  const dir = resolve("supabase/migrations")
  const migrations = (await readdir(dir)).filter(name => name.endsWith(".sql") && !name.includes("demo") && Number(name.slice(0,3)) <= 47).sort()
  for (const name of migrations) {
    // gen_random_uuid is built into this PostgreSQL; pgcrypto is not bundled.
    const sql = (await readFile(join(dir,name), "utf8")).replace("create extension if not exists pgcrypto;", "")
    try { await db.exec(sql) } catch (cause) { throw new Error(`Migración ${name}: ${cause.message}`, { cause }) }
    if (name.startsWith("001_")) {
      await db.query("insert into auth.users(id) values($1),($2)",[admin,employee])
      await db.query("insert into public.profiles(id,full_name,email,role) values($1,'Admin Test','admin@example.invalid','super_admin'),($2,'Empleado Test','employee@example.invalid','empleado_campo')",[admin,employee])
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin])
    }
  }
  checks++; console.log("PASS: migrations compile against real preceding schemas")
  const clientId = randomUUID(), farmId = randomUUID(), renspaId = randomUUID()
  const client2 = randomUUID(), farm2 = randomUUID(), renspa2 = randomUUID()
  await db.query("insert into clients(id,legal_name) values($1,'Cliente Test'),($2,'Otro Test')",[clientId,client2])
  await db.query("insert into farms(id,client_id,name,service_mode) values($1,$2,'San Ignacio Test','veterinaria'),($3,$4,'Segundo Test','veterinaria')",[farmId,clientId,farm2,client2])
  await db.query("insert into farm_renspas(id,farm_id,number) values($1,$2,'TEST-1'),($3,$4,'TEST-2')",[renspaId,farmId,renspa2,farm2])
  const eid = number => `03201000650${number}`
  const row = (number, overrides={}) => ({ row:number-1855, eid:eid(number), tag:String(number), date:"2025-05-10", time:"11:35:00", sex:"", notes:"",
    rawCsv:{"ID electrónico":eid(number),"Número de etiqueta":String(number),Fecha:"2025-05-10",Time:"11:35:00",TONO:"Yes"},
    expectedClientId:clientId,expectedFarmId:farmId,expectedRenspaId:renspaId,expectedSex:"macho",...overrides })
  async function receive(first,last,renspa=renspaId,sex="macho") {
    await db.query("select public.receive_ear_tag_bag($1,$2,'2026-11-16',$3,$4,$5,$6::jsonb)",[
      randomUUID(),renspa,eid(first),eid(last),last-first+1,JSON.stringify([{first:eid(first),last:eid(last),sex}])])
  }
  const hash = label => createHash("sha256").update(label).digest("hex")
  const confirm = async (label,rows) => (await db.query("select public.confirm_gallagher_csv_links($1,$2,$3::jsonb,$4::jsonb) as result",[
    `${label}.csv`,hash(label),JSON.stringify(["ID electrónico","Número de etiqueta","Fecha","Time","TONO"]),JSON.stringify(rows)])).rows[0].result
  const snapshot = async () => (await db.query(`select
    (select count(*) from animals) animals,(select count(*) from animal_events) events,
    (select count(*) from livestock_work_sessions) sessions,(select count(*) from livestock_imports) imports,
    (select count(*) from gallagher_csv_confirmations) confirmations,(select count(*) from ear_tag_session_links) links,
    (select count(*) from ear_tags where status='utilizada') used`)).rows[0]
  async function mustRollback(label,rows,pattern) {
    const before = await snapshot()
    await assert.rejects(()=>confirm(label,rows),pattern)
    assert.deepEqual(await snapshot(),before)
    checks++;console.log(`PASS: ${label} rejects atomically`)
  }
  await db.exec("set role authenticated")
  await receive(1857,1862)
  const six = Array.from({length:6},(_,i)=>row(1857+i))
  const first = await confirm("TOROS2",six)
  assert.equal(first.animals,6);assert.equal(first.created,6);assert.equal(first.tags_used,6);assert.equal(first.sessions.length,1)
  assert.equal((await db.query("select count(*) n from animals where sex='macho'")).rows[0].n,6)
  assert.equal((await db.query("select status from livestock_work_sessions where id=$1",[first.sessions[0].session_id])).rows[0].status,"confirmada")
  assert.equal((await db.query("select available,used from ear_tag_stock_by_range")).rows[0].used,6)
  checks++;console.log("PASS: six tags, sex, confirmed session and stock counts")
  const saved = await snapshot(), repeated = await confirm("TOROS2",six)
  assert.equal(repeated.already_imported,true);assert.equal(repeated.confirmation_id,first.confirmation_id);assert.deepEqual(await snapshot(),saved)
  checks++;console.log("PASS: identical file does not duplicate any record")
  const later = await confirm("later",six.map(item=>({...item,date:"2025-05-11"})))
  assert.equal(later.created,0);assert.equal(later.tags_used,0);assert.equal(later.animals,6)
  assert.equal((await snapshot()).animals,6)
  checks++;console.log("PASS: later session reuses animals and retains first usage")
  await mustRollback("CSV sex conflict",[{...six[0],sex:"hembra"}],/sexo/)
  await mustRollback("stale ownership",[{...six[0],expectedRenspaId:renspa2}],/cambió/)
  await mustRollback("unknown tag",[row(2000)],/sin alta/)
  await mustRollback("invalid date",[{...six[0],date:"2025-02-31"}],/date|fecha|range/i)
  await receive(1900,1902)
  await db.exec("reset role")
  await db.query("insert into animals(farm_id,tag_number,electronic_id,sex,status) values($1,'1902',$2,'hembra','activo')",[farmId,eid(1902)])
  await db.exec("set role authenticated")
  await mustRollback("existing animal sex conflict",[row(1900),row(1901),row(1902)],/sexo/)
  await mustRollback("visual identity conflict",[row(1900,{tag:"1857"})],/visual/)
  await mustRollback("duplicate reading",[row(1900),row(1900)],/repetida/)
  await receive(1950,1950,renspa2,"hembra")
  const multiple = await confirm("multi-owner",[row(1900),row(1950,{expectedClientId:client2,expectedFarmId:farm2,expectedRenspaId:renspa2,expectedSex:"hembra"})])
  assert.equal(multiple.sessions.length,2);assert.equal(multiple.tags_used,2);assert.equal(multiple.animals,2)
  checks++;console.log("PASS: mixed owners produce separate sessions for their own RENSPA")
  await assert.rejects(()=>db.query("update ear_tags set status='disponible'"),/permission/)
  checks++;console.log("PASS: direct stock writes are forbidden")
  await assert.rejects(()=>db.query("select public.revert_livestock_import($1,'test')",[first.sessions[0].import_id]),/caravanas utilizadas/)
  checks++;console.log("PASS: generic reversal cannot invalidate used tag links")
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[employee])
  assert.equal((await db.query("select count(*) n from ear_tag_session_links")).rows[0].n,0)
  assert.equal((await db.query("select count(*) n from gallagher_csv_confirmations")).rows[0].n,0)
  await assert.rejects(()=>confirm("forbidden",six),/permiso/)
  checks++;console.log("PASS: unassigned user cannot see links or confirm")
  console.log(`${checks} PostgreSQL integration checks passed`)
} finally { await db.close() }
