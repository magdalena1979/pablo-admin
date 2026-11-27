import { useEffect, useRef, useState } from "react"
import { AppSelect } from "@/components/ui/AppSelect"
import { FileUp, FileWarning, X } from "lucide-react"
import type { CsvFileReview } from "@/services/gallagher-csv-preview.service"
import type { CsvConfirmationResult } from "@/services/gallagher-csv-confirm.service"
import { csvConfirmationBlocker, eligibleCsvBatch, csvSessionTypes, isCsvSessionType, suggestedCsvSessionType, usesHealthPlan, type CsvHealthLink, type CsvSessionType } from "./csv-confirmation"
import { listHealthPlanItems, type AssignedHealthPlanItem } from "@/features/farms/health-plan.service"
import { summarizeCsvObservations } from "@/features/farms/cria-tacto"
import { missingGallagherTags } from "./GallagherTagRegistrationDialog"
import "./csv-import-dialog.css"

export function CsvImportDialog({files,confirmed,errors,busy,progress,canConfirm,onConfirm,onCancel,onReview,onRegisterTags,onSessionTypeChange,onHealthLinkChange}:{files:CsvFileReview[];confirmed:Record<string,CsvConfirmationResult>;errors:Record<string,string>;busy:boolean;progress:string;canConfirm:boolean;onConfirm():void;onCancel():void;onReview():void;onRegisterTags?(file:CsvFileReview):void;onSessionTypeChange(file:CsvFileReview,type:CsvSessionType):void;onHealthLinkChange(file:CsvFileReview,farmId:string,link:CsvHealthLink):void}){
 const ref=useRef<HTMLDialogElement>(null)
 const [finalCheck,setFinalCheck]=useState(false)
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus()}},[])
 const [plans, setPlans] = useState<AssignedHealthPlanItem[] | null>(null)
 const [planError, setPlanError] = useState("")
 const [planRetry, retryPlans] = useState(0)
 const farmKey = [...new Set(files.filter(file => usesHealthPlan(file.sessionType) && !file.confirmation && !confirmed[file.hash])
   .flatMap(file => file.rows.flatMap(row => row.registration?.farmId ? [row.registration.farmId] : [])))].sort().join(",")
 useEffect(() => {
   if (!farmKey) return
   const controller = new AbortController()
   setPlans(null)
   setPlanError("")
   void listHealthPlanItems(farmKey.split(","), controller.signal).then(items => {
     if (!controller.signal.aborted) setPlans(items)
   }).catch(cause => {
     if (!controller.signal.aborted) setPlanError(cause instanceof Error ? cause.message : "No pudimos cargar el plan sanitario.")
   })
   return () => controller.abort()
 }, [farmKey, planRetry])
 const ready=eligibleCsvBatch(files,confirmed,errors)
 const saved=files.filter(file=>confirmed[file.hash]).length
 const omitted=files.length-ready.length-saved
 function requestConfirmation(){if(omitted>0)setFinalCheck(true);else onConfirm()}
 return <dialog ref={ref} className="csv-import-dialog" aria-labelledby="csv-import-title" onCancel={event=>{event.preventDefault();if(!busy)onCancel()}}>
 <header><div className="csv-import-dialog-icon" aria-hidden="true"><FileUp size={22}/></div><div><h2 id="csv-import-title">Revisar importación</h2>{files.length>1&&<p>{files.length} archivos seleccionados</p>}</div><button className="csv-dialog-close" disabled={busy} aria-label="Cerrar revisión" onClick={onCancel}><X size={20}/></button></header>
 <div className="csv-import-dialog-content">
 {files.map(file=>{
  const done=!file.error&&confirmed[file.hash],reason=errors[file.file.id]||csvConfirmationBlocker(file)
  const owners=[...new Map(file.rows.flatMap(row=>row.registration?[[`${row.registration.farmId}:${row.registration.renspaId}`,row.registration] as const]:[])).values()]
  const count=(sex?:string)=>new Set(file.rows.filter(row=>!sex||row.registration?.sex===sex).map(row=>row.eid)).size
  const missing=missingGallagherTags(file)
  const observations = summarizeCsvObservations(file.rows.flatMap(row => {
    const raw = file.rawRows[row.row - 2]
    return raw ? [raw] : []
  }))
  const suggestion = suggestedCsvSessionType(file.file.name)
  return <article key={file.file.id} className="csv-dialog-file"><div className="csv-dialog-file-heading"><strong>{file.file.name}</strong><span className={done?"saved":reason?"blocked":"ready"}>{done?"Guardado":reason?"Requiere atención":"Listo"}</span></div>
   <p>{count()} animales · {count("macho")} machos · {count("hembra")} hembras</p>
   {!done && !file.confirmation && !file.error && canConfirm && <label className="csv-session-type">
     Tipo de jornada
     <AppSelect aria-label={`Tipo de jornada de ${file.file.name}`} disabled={busy}
       value={file.sessionType ?? "otro"} onChange={event => { if (isCsvSessionType(event.target.value)) onSessionTypeChange(file, event.target.value) }}>
       {Object.entries(csvSessionTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
     </AppSelect>
     {suggestion !== "otro" && <small>Por el nombre del archivo, se sugiere {csvSessionTypes[suggestion].toLowerCase()}.</small>}
   </label>}
   {!done && !file.confirmation && !file.error && canConfirm && usesHealthPlan(file.sessionType) &&
     <div className="csv-health-links">
       {planError ? <p role="alert">{planError} <button type="button" className="text-button" onClick={() => retryPlans(value => value + 1)}>Reintentar</button></p>
         : !plans ? <p role="status">Cargando el plan sanitario…</p> :
         [...new Map(owners.map(owner => [owner.farmId, owner])).values()].map(owner => {
           const items = plans.filter(item => item.farm_id === owner.farmId)
           const link = file.healthLinks?.[owner.farmId]
           const item = items.find(row => row.id === link?.itemId)
           return <fieldset key={owner.farmId} disabled={busy}>
             <legend>Plan sanitario de {owner.farm}</legend>
             {items.length === 0 ? <p>Revisá la actividad ganadera del campo y los trabajos del plan sanitario general.</p> :
               <><label className="csv-session-type">Trabajo realizado
                 <AppSelect value={link?.itemId ?? ""} onChange={event => onHealthLinkChange(file, owner.farmId, { itemId: event.target.value, allAnimals: false })}>
                   <option value="">Elegir trabajo del plan</option>
                   {items.map(row => <option key={row.id} value={row.id}>{[row.animal_group, row.name].filter(Boolean).join(" · ")}</option>)}
                 </AppSelect>
               </label>
               {item && <>
                 <label className="csv-health-scope"><input type="checkbox" checked={link?.allAnimals ?? false}
                   onChange={event => onHealthLinkChange(file, owner.farmId, { itemId: item.id, allAnimals: event.target.checked })}/>
                   Confirmo que este trabajo se hizo a todos los animales de este campo incluidos en el archivo
                 </label>
                 {!link?.allAnimals && <small>{item.action_type === "sangrado"
                   ? "Se vinculan los animales marcados con sangrado en el CSV."
                   : "Se vincula el trabajo a la jornada, sin asignar aplicaciones individuales."}</small>}
               </>}
               </>}
           </fieldset>
         })}
     </div>}
   {(observations.prenada || observations.vacia || observations.pendiente) > 0 && <p>
     Lecturas de gestación · {observations.prenada} preñadas · {observations.vacia} vacías
     {observations.pendiente > 0 && ` · ${observations.pendiente} por revisar`}
   </p>}
   {observations.sangrado > 0 && <p>Sangrado para brucelosis · {observations.sangrado} lecturas marcadas</p>}
   {owners.map(owner=><p key={`${owner.farmId}:${owner.renspaId}`}><b>{owner.farm}</b> · {owner.client}<small>RENSPA {owner.renspa}</small></p>)}
   {!done&&reason&&<div className="csv-dialog-warning">{!file.error&&missing.length?`Sin alta: ${missing.length} ${missing.length===1?"caravana":"caravanas"}.`:reason}</div>}
   {!done&&!file.error&&reason&&missing.length>0&&onRegisterTags&&<button type="button" className="primary-button csv-register-tags" disabled={busy}
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
