import type { CsvFileReview } from "@/services/gallagher-csv-preview.service"
import type { CsvConfirmationResult } from "@/services/gallagher-csv-confirm.service"
import { csvConfirmationBlocker } from "./csv-confirmation"

export function CsvReviewCard({file,done,failure,busy,canConfirm,onConfirm,onReview,onDismiss}:{file:CsvFileReview;done?:CsvConfirmationResult;failure?:string;busy:boolean;canConfirm:boolean;onConfirm():void;onReview():void;onDismiss():void}){
 const missing=[...new Map(file.rows.filter(row=>row.result==="sin_alta").map(row=>[row.eid,row])).values()]
 const conflicts=file.rows.filter(row=>row.result!=="coincidencia"&&row.result!=="sin_alta")
 const blocker=failure||csvConfirmationBlocker(file)
 const animals=new Set(file.rows.map(row=>row.eid)).size
 const male=new Set(file.rows.filter(row=>row.registration?.sex==="macho").map(row=>row.eid)).size
 const female=new Set(file.rows.filter(row=>row.registration?.sex==="hembra").map(row=>row.eid)).size
 const owners=[...new Map(file.rows.filter(row=>row.registration).map(row=>[`${row.registration!.farmId}:${row.registration!.renspaId}`,row.registration!])).values()]
 return <article className="csv-simple-card"><div className="csv-simple-heading"><strong>{file.file.name}</strong><button className="text-button" disabled={busy} onClick={onDismiss}>Cerrar revisión</button></div>
 {done?<div role="status"><h3>{done.already_imported?"Este archivo ya estaba guardado":"Sesión guardada"}</h3><p>{done.animals} animales · {done.sessions.length} sesiones</p></div>:file.error?<div role="alert"><h3>No pudimos leer este archivo</h3><p>{file.error}</p></div>:file.empty?<div role="status"><h3>Este archivo no contiene animales</h3><p>Elegí otro CSV. No se guardó ninguna sesión.</p></div>:<>
 <h3>{missing.length?`Falta dar de alta ${missing.length} ${missing.length===1?"caravana":"caravanas"}`:blocker?"Hay datos para revisar":"Listo para guardar"}</h3>
 <p>{animals} animales · {male} machos · {female} hembras</p>
 {owners.map(owner=><p key={`${owner.farmId}:${owner.renspaId}`}><strong>{owner.farm}</strong> · {owner.client} · RENSPA {owner.renspa}</p>)}
 {missing.length>0&&<div role="alert"><p>Registrá las caravanas faltantes en Caravanas y después presioná Revisar nuevamente. Este archivo todavía no se puede guardar.</p><details><summary>Ver {missing.length} caravanas faltantes</summary><ul>{missing.map(row=><li key={row.eid}>{row.tag||"Sin número visual"} · EID {row.eid}</li>)}</ul></details></div>}
 {conflicts.length>0&&<p role="alert">{conflicts.length} lecturas tienen datos en conflicto o errores. Abrí el detalle para revisarlas.</p>}
 {blocker&&!failure&&!missing.length&&!conflicts.length&&<p role="alert">{blocker}</p>}
 {failure&&<p className="form-error" role="alert">{failure}</p>}
 <details className="csv-simple-details"><summary>Ver detalle de las lecturas</summary><div className="table-wrap drive-matches"><table className="data-table"><thead><tr><th>Caravana</th><th>EID</th><th>Fecha</th><th>Sexo del rango</th><th>Resultado</th></tr></thead><tbody>{file.rows.map(row=><tr key={row.row}><td>{row.tag||"—"}</td><td>{row.eid}</td><td>{row.date} {row.time}</td><td>{row.registration?.sex||"Sin alta"}</td><td>{row.result==="coincidencia"?"Reconocida":row.detail}</td></tr>)}</tbody></table></div></details>
 <div className="csv-simple-actions">{blocker?<button className="secondary-button" disabled={busy} onClick={onReview}>Revisar nuevamente</button>:canConfirm?<button className="primary-button" disabled={busy} onClick={onConfirm}>{busy?"Guardando…":"Confirmar y guardar"}</button>:<p>La confirmación requiere un superadministrador.</p>}</div>
 </>}
 </article>
}
