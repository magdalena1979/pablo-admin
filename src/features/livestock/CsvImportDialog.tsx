import { useEffect, useRef, useState } from "react"
import { FileUp, FileWarning, X } from "lucide-react"
import type { CsvFileReview } from "@/services/gallagher-csv-preview.service"
import type { CsvConfirmationResult } from "@/services/gallagher-csv-confirm.service"
import { csvConfirmationBlocker, eligibleCsvBatch } from "./csv-confirmation"
import { missingGallagherTags } from "./GallagherTagRegistrationDialog"
import "./csv-import-dialog.css"

export function CsvImportDialog({files,confirmed,errors,busy,progress,canConfirm,onConfirm,onCancel,onReview,onRegisterTags}:{files:CsvFileReview[];confirmed:Record<string,CsvConfirmationResult>;errors:Record<string,string>;busy:boolean;progress:string;canConfirm:boolean;onConfirm():void;onCancel():void;onReview():void;onRegisterTags?(file:CsvFileReview):void}){
 const ref=useRef<HTMLDialogElement>(null)
 const [finalCheck,setFinalCheck]=useState(false)
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus()}},[])
 const ready=eligibleCsvBatch(files,confirmed,errors)
 const saved=files.filter(file=>confirmed[file.hash]).length
 const omitted=files.length-ready.length-saved
 function requestConfirmation(){if(omitted>0)setFinalCheck(true);else onConfirm()}
 return <dialog ref={ref} className="csv-import-dialog" aria-labelledby="csv-import-title" onCancel={event=>{event.preventDefault();if(!busy)onCancel()}}>
 <header><div className="csv-import-dialog-icon" aria-hidden="true"><FileUp size={22}/></div><div><h2 id="csv-import-title">Revisar importación</h2>{files.length>1&&<p>{files.length} archivos seleccionados</p>}</div><button className="csv-dialog-close" disabled={busy} aria-label="Cerrar revisión" onClick={onCancel}><X size={20}/></button></header>
 <div className="csv-import-dialog-content">
 {files.map(file=>{
  const done=confirmed[file.hash],reason=errors[file.file.id]||csvConfirmationBlocker(file)
  const owners=[...new Map(file.rows.flatMap(row=>row.registration?[[`${row.registration.farmId}:${row.registration.renspaId}`,row.registration] as const]:[])).values()]
  const count=(sex?:string)=>new Set(file.rows.filter(row=>!sex||row.registration?.sex===sex).map(row=>row.eid)).size
  const missing=missingGallagherTags(file)
  return <article key={file.file.id} className="csv-dialog-file"><div className="csv-dialog-file-heading"><strong>{file.file.name}</strong><span className={done?"saved":reason?"blocked":"ready"}>{done?"Guardado":reason?"Requiere atención":"Listo"}</span></div>
   <p>{count()} animales · {count("macho")} machos · {count("hembra")} hembras</p>
   {owners.map(owner=><p key={`${owner.farmId}:${owner.renspaId}`}><b>{owner.farm}</b> · {owner.client}<small>RENSPA {owner.renspa}</small></p>)}
   {!done&&reason&&<div className="csv-dialog-warning">{missing.length?`Sin alta: ${missing.length} ${missing.length===1?"caravana":"caravanas"}.`:reason}</div>}
   {!done&&reason&&missing.length>0&&onRegisterTags&&<button type="button" className="primary-button csv-register-tags" disabled={busy}
     onClick={()=>onRegisterTags(file)}>Dar de alta caravanas</button>}
   {!done&&reason&&<details><summary>{missing.length ? "Ver caravanas faltantes" : "Ver qué falta resolver"}</summary>{missing.length>0?<ul>{missing.map(row=><li key={row.eid}>{row.tag||"Sin número"} · {row.eid}</li>)}</ul>:file.rows.filter(row=>row.result!=="coincidencia").map(row=><p key={row.row}>{row.tag||row.eid}: {row.detail}</p>)}</details>}
  </article>
 })}
 {busy?<p className="csv-dialog-status" role="status">{progress||"Guardando sesiones…"}</p>:ready.length>0?<p className="csv-dialog-status">Se {ready.length===1?"guardará 1 archivo":"guardarán "+ready.length+" archivos"}{files.length>ready.length?". Los demás no se importarán":""}.</p>:saved===files.length?<p role="status">Todos los archivos están guardados.</p>:<p>No hay archivos listos para guardar.</p>}
 </div>
 <footer><button className="secondary-button" disabled={busy} onClick={onCancel}>{saved?"Cerrar":"Cancelar"}</button>{!busy&&ready.length===0&&saved<files.length&&<button className="secondary-button" onClick={onReview}>Revisar nuevamente</button>}{canConfirm&&ready.length>0&&<button className="primary-button" disabled={busy} onClick={requestConfirmation}>{busy?"Guardando…":"Confirmar y guardar"}</button>}</footer>
 {finalCheck&&<PartialImportConfirmation count={ready.length} omitted={omitted} onBack={()=>setFinalCheck(false)} onConfirm={()=>{setFinalCheck(false);onConfirm()}}/>}
 </dialog>
}

function PartialImportConfirmation({count,omitted,onBack,onConfirm}:{count:number;omitted:number;onBack():void;onConfirm():void}){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus()}},[])
 return <dialog ref={ref} className="csv-partial-confirm" aria-labelledby="partial-import-title" aria-describedby="partial-import-description" onCancel={event=>{event.preventDefault();onBack()}}>
 <div className="csv-partial-icon"><FileWarning size={26}/></div>
 <h2 id="partial-import-title">{count===1?"Se guardará 1 archivo":`Se guardarán ${count} archivos`}</h2>
 <p id="partial-import-description"><strong>Los demás no se importarán.</strong></p>
 <p>{omitted===1?"1 archivo requiere atención y quedará sin guardar.":`${omitted} archivos requieren atención y quedarán sin guardar.`}</p>
 <div className="csv-partial-actions"><button className="secondary-button" autoFocus onClick={onBack}>Volver a revisar</button><button className="primary-button" onClick={onConfirm}>{count===1?"Sí, guardar 1 archivo":`Sí, guardar ${count} archivos`}</button></div>
 </dialog>
}
