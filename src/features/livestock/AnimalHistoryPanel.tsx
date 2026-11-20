import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import type { AnimalRow } from "@/services/livestock-registry.service"
import { loadAnimalHistory } from "@/services/animal-history.service"
import { latestRecorded, recordedFields, type HistoryEntry } from "./animal-history"
import "./animal-history.css"
const format=(date:string)=>new Intl.DateTimeFormat("es-AR",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Argentina/Buenos_Aires"}).format(new Date(date))
export function AnimalHistoryPanel({animal,onClose}:{animal:AnimalRow;onClose():void}) {
  const [entries,setEntries]=useState<HistoryEntry[]>([])
  const [loading,setLoading]=useState(true),[error,setError]=useState("")
  const [tab,setTab]=useState("historial"),[attempt,setAttempt]=useState(0)
  const closeRef=useRef(onClose); closeRef.current=onClose
  const panel=useRef<HTMLElement>(null)
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null
    panel.current?.focus()
    const overflow=document.body.style.overflow;document.body.style.overflow="hidden"
    function key(event:KeyboardEvent){
      if(event.key==="Escape")closeRef.current()
      if(event.key!=="Tab")return
      const nodes=panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]')
      if(!nodes?.length)return
      const first=nodes[0],last=nodes[nodes.length-1]
      if(event.shiftKey && (document.activeElement===first || document.activeElement===panel.current)){event.preventDefault();last.focus()}
      else if(!event.shiftKey && (document.activeElement===last || document.activeElement===panel.current)){event.preventDefault();first.focus()}
    }
    document.addEventListener("keydown",key)
    return()=>{document.body.style.overflow=overflow;document.removeEventListener("keydown",key);previous?.focus()}
  },[])
  useEffect(()=>{let active=true;setLoading(true);setError("");setEntries([])
    void loadAnimalHistory(animal.id).then(rows=>{if(active)setEntries(rows)}).catch(cause=>{if(active)setError(cause?.message||"No pudimos cargar el historial.")}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[animal.id,attempt])
  const latest=latestRecorded(entries)
  return <div className="animal-history-backdrop" onClick={onClose}><aside ref={panel} tabIndex={-1} className="animal-history-panel" role="dialog" aria-modal="true" aria-labelledby="animal-history-title" onClick={event=>event.stopPropagation()}>
    <header className="animal-history-heading"><div><span className="eyebrow">FICHA DEL ANIMAL</span><h2 id="animal-history-title">Caravana {animal.tagNumber}</h2><p>EID {animal.electronicIdRaw??animal.electronicId??"Sin completar"}</p></div><button className="icon-button" aria-label="Cerrar ficha del animal" onClick={onClose}><X/></button></header>
    <div className="animal-history-owner"><strong>{animal.clientName||"Cliente sin vínculo"} · {animal.farmName||"Establecimiento sin vínculo"}</strong><span><strong>Sexo: {animal.sex === "macho" ? "Macho" : animal.sex === "hembra" ? "Hembra" : animal.sex || "Sin completar"}</strong></span><span>RENSPA {animal.renspas.map(row=>row.number).join(", ")||"sin vínculo"}</span></div>
    <nav className="workspace-tabs" aria-label="Secciones de la ficha">{[["resumen","Resumen"],["historial","Historial"],["datos","Datos registrados"]].map(([key,label])=><button key={key} className={tab===key?"active":""} aria-current={tab===key?"page":undefined} onClick={()=>setTab(key)}>{label}</button>)}</nav>
    <div className="animal-history-content">
      {loading?<p role="status">Cargando historial…</p>:error?<div role="alert" className="data-error"><strong>No pudimos cargar el historial</strong><span>{error}</span><button className="secondary-button" onClick={()=>setAttempt(value=>value+1)}>Reintentar</button></div>:<>
      {tab==="resumen"&&<><dl className="animal-history-summary"><div><dt>Sexo registrado</dt><dd>{animal.sex||"Sin completar"}</dd></div><div><dt>Estado</dt><dd>{animal.status}</dd></div><div><dt>Primera fecha en este historial</dt><dd>{entries.length?format(entries[entries.length-1].date):"Sin registros"}</dd></div><div><dt>Última fecha en este historial</dt><dd>{entries.length?format(entries[0].date):"Sin registros"}</dd></div></dl><h3>Últimos valores registrados</h3><p>Cada dato conserva su fecha. Una lectura posterior sin ese dato no lo actualiza.</p><Traits rows={latest}/></>}
      {tab==="historial"&&<><h3>Historial del animal</h3><p>{entries.length} registros guardados · Más recientes primero</p>{!entries.length?<p>Todavía no hay registros vinculados a este animal.</p>:<ol className="animal-timeline">{entries.map(entry=><li key={entry.id}><time dateTime={entry.date}>{format(entry.date)}</time><h4>{entry.title}</h4>{entry.sessionTitle&&<p>Sesión: {entry.sessionTitle}</p>}{entry.notes&&<p>{entry.notes}</p>}<FieldList fields={recordedFields(entry.fields)}/><small>Origen: {entry.source}{entry.filename?` · ${entry.filename}`:""}</small></li>)}</ol>}<p className="animal-history-footnote">Solo aparecen registros guardados. Seleccionar un CSV sin confirmar su vinculación no lo agrega al historial.</p></>}
      {tab==="datos"&&<><h3>Datos registrados en los archivos</h3><p>Valores originales, sin interpretar abreviaturas ni convertirlos en diagnósticos.</p><Traits rows={latest}/></>}
      </>}
    </div>
  </aside></div>
}
function FieldList({fields}:{fields:Record<string,string>}){return Object.keys(fields).length?<dl className="animal-history-fields">{Object.entries(fields).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>:null}
function Traits({rows}:{rows:ReturnType<typeof latestRecorded>}){return rows.length?<div className="animal-traits">{rows.map(row=><article key={row.field}><strong>{row.field}</strong><b>{row.value}</b><time>{format(row.date)}</time><small>{row.filename||"Registro del sistema"}</small></article>)}</div>:<p>No hay valores adicionales registrados.</p>}
