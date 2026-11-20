import { useEffect, useRef, useState } from "react"
import { ArrowLeft, FileUp, Plus, X } from "lucide-react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/components/ui/Presentation"
import { reviewGallagherCsv, type CsvFileReview } from "@/services/gallagher-csv-preview.service"
import { confirmGallagherCsv, type CsvConfirmationResult } from "@/services/gallagher-csv-confirm.service"
import { csvConfirmationBlocker, eligibleCsvBatch } from "./csv-confirmation"
import { runCsvBatch, type CsvBatchReport } from "./csv-batch"
import { CsvImportDialog } from "./CsvImportDialog"
import { EmptyCsvDialog } from "./EmptyCsvDialog"
import { useAuth } from "@/app/providers/AuthProvider"
import "./drive-review.css"


const shareErrors: Record<string, string> = {
  "archivo-invalido": "Compartí un archivo con extensión .csv.",
  "archivo-grande": "El límite es de 2 MB por CSV y 20 MB en total.",
  "recepcion-fallida": "No pudimos recibir el archivo. Volvé a compartirlo o usá Importar CSV.",
}

export function CsvImportPanel({ onConfirmed, pageTitle, sharedCsvId }: { onConfirmed?(): void; pageTitle?: string; sharedCsvId?: string }) {
  const { profile } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState<Record<string,CsvConfirmationResult>>({})
  const [fileErrors, setFileErrors] = useState<Record<string,string>>({})
  const [processingId, setProcessingId] = useState("")
  const [batchProgress, setBatchProgress] = useState("")
  const [batchReport, setBatchReport] = useState<CsvBatchReport|null>(null)
  const [stopping, setStopping] = useState(false)
  const stopRequested = useRef(false)
  const sourceFiles = useRef<File[]>([])
  const saving = useRef(false)
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState("")
  const [error, setError] = useState(""), [reviews, setReviews] = useState<CsvFileReview[] | null>(null)
  const [fileId, setFileId] = useState("")
  const [readingShare, setReadingShare] = useState(false)
  const shareRequest = useRef<AbortController | null>(null)
  const [emptyNotice, setEmptyNotice] = useState<{names:string[];hasOtherFiles:boolean}|null>(null)
  const input = useRef<HTMLInputElement>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort(); shareRequest.current?.abort(); stopRequested.current=true }, [])
  const hasSharedCsv = Boolean(sharedCsvId && /^[\da-f-]{36}$/i.test(sharedCsvId))
  const shareError = sharedCsvId && !hasSharedCsv
    ? (Object.hasOwn(shareErrors, sharedCsvId) ? shareErrors[sharedCsvId] : shareErrors["recepcion-fallida"])
    : ""

  async function reviewSharedCsv() {
    if (!sharedCsvId || shareRequest.current || request.current || saving.current) return
    const controller = new AbortController()
    shareRequest.current = controller
    setReadingShare(true)
    setError("")
    try {
      const response = await fetch(`/gallagher-share/${encodeURIComponent(sharedCsvId)}`, {
        cache: "no-store", signal: controller.signal,
      })
      if (response.status === 404) throw new Error("El archivo compartido ya no está disponible. Volvé a compartirlo desde WhatsApp.")
      if (!response.ok || !response.headers.get("content-type")?.startsWith("multipart/form-data")) {
        throw new Error("No pudimos abrir el archivo compartido. Volvé a compartirlo o usá Importar CSV.")
      }
      const files = (await response.formData()).getAll("csv").filter((value): value is File => value instanceof File)
      if (!files.length) throw new Error("No encontramos archivos CSV en el contenido compartido.")
      if (!controller.signal.aborted) await review(files)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : shareErrors["recepcion-fallida"])
    } finally {
      shareRequest.current = null
      if (!controller.signal.aborted) setReadingShare(false)
    }
  }
  async function review(files: File[]) {
    if (request.current || saving.current || !files.length) return
    const controller = new AbortController(); request.current = controller
    sourceFiles.current=files
    setBusy(true); setError(""); setReviews(null); setFileId(""); setFileErrors({}); setBatchReport(null)
    try {
      const checked = await reviewGallagherCsv(files, controller.signal, setProgress)
      if (controller.signal.aborted) return
      const empty = checked.filter(file => file.empty && !file.error)
      const next = checked.filter(file => !file.empty || Boolean(file.error))
      if (empty.length) {
        setEmptyNotice({names:empty.map(file=>file.file.name),hasOtherFiles:next.length>0})
      }
      sourceFiles.current = files.filter(file => next.some(item => item.file.name === file.name))
      if (!next.length) { setReviews(null); return }
      const existing=Object.fromEntries(next.filter(file=>file.confirmation).map(file=>[file.hash,file.confirmation!]))
      setConfirmed(current=>({...current,...existing}))
      setReviews(next); setFileId(next.find(file => !file.confirmation&&!csvConfirmationBlocker(file))?.file.id ?? next.find(file => file.rows.length)?.file.id ?? next[0]?.file.id ?? "")
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "No pudimos revisar los CSV.")
    } finally { if (request.current === controller) { request.current = null; setBusy(false); setProgress("") } }
  }
  const selected = reviews?.find(file => file.file.id === fileId)
  const completed = selected ? confirmed[selected.hash] : undefined
  const blocker = selected ? fileErrors[selected.file.id]||csvConfirmationBlocker(selected) : ""
  const eligible = eligibleCsvBatch(reviews??[],confirmed,fileErrors)
  function rememberSuccess(file:CsvFileReview,result:CsvConfirmationResult){
    setConfirmed(current=>({...current,[file.hash]:result}))
    const usedEids=new Set(file.rows.map(row=>row.eid))
    setReviews(current=>current?.map(item=>({...item,rows:item.rows.map(row=>row.registration&&usedEids.has(row.eid)?{...row,registration:{...row.registration,status:"utilizada"}}:row)}))??null)
  }
  function rememberFailure(file:CsvFileReview,message:string){setFileErrors(current=>({...current,[file.file.id]:message}))}
  async function confirm() {
    if (!selected || saving.current || blocker || completed) return
    saving.current = true; setConfirming(true); setError(""); setProcessingId(selected.file.id); setBatchReport(null)
    try {
      const result = await confirmGallagherCsv(selected)
      rememberSuccess(selected,result)
      onConfirmed?.()
    } catch (cause) {
      const message=cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "No pudimos confirmar el archivo."
      setError(message);rememberFailure(selected,message)
    } finally { saving.current = false; setConfirming(false); setProcessingId("") }
  }
  async function confirmBatch(){
    if(saving.current||!eligible.length)return
    saving.current=true;stopRequested.current=false
    setConfirming(true);setError("");setBatchReport(null);setStopping(false)
    try{
      const report=await runCsvBatch(eligible,{
        confirm:confirmGallagherCsv,
        progress:(file,index,total)=>{setProcessingId(file.file.id);setFileId(file.file.id);setBatchProgress(`Guardando ${index} de ${total}: ${file.file.name}`)},
        success:rememberSuccess,failure:rememberFailure,shouldStop:()=>stopRequested.current,
      })
      setBatchReport(report)
      if(report.saved||report.alreadyImported)onConfirmed?.()
      if(!report.failed&&!report.pending&&!report.stopped){
        setReviews(null);setFileId("");setError("");setBatchReport(null);sourceFiles.current=[]
      }
    }finally{saving.current=false;setConfirming(false);setProcessingId("");setBatchProgress("");setStopping(false)}
  }


  const importButtons = <div className="csv-import-buttons">
    {sourceFiles.current.length > 0 && reviews && reviews.length > 1 &&
      <button type="button" className="secondary-button" disabled={busy || confirming || readingShare} onClick={() => void review(sourceFiles.current)}>Revisar nuevamente</button>}
    <button type="button" className={hasSharedCsv ? "secondary-button" : "primary-button"} disabled={busy || confirming || readingShare}
      aria-label="Importar CSV" title={pageTitle ? "Importar CSV" : undefined} onClick={() => input.current?.click()}>
      {pageTitle ? <><Plus size={20} aria-hidden="true"/><span className="csv-mobile-import-label">Importar CSV</span></> : <><FileUp size={17} aria-hidden="true"/>{busy ? "Revisando…" : "Importar CSV"}</>}
    </button>
  </div>

  return <section className={`drive-review-panel${pageTitle ? " csv-page-import" : ""}`} aria-label="Importación de CSV de Gallagher">
    {emptyNotice&&<EmptyCsvDialog names={emptyNotice.names} hasOtherFiles={emptyNotice.hasOtherFiles} onClose={()=>setEmptyNotice(null)} onChoose={()=>{setEmptyNotice(null);input.current?.click()}}/>}
    <input ref={input} type="file" accept=".csv,text/csv,text/comma-separated-values" multiple hidden onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; void review(files) }}/>
    {pageTitle ? <div className="compact-list-heading">
      <Link to="/inicio" className="text-button compact-back" aria-label="Volver a Inicio"><ArrowLeft size={20} aria-hidden="true"/></Link>
      <PageHeader title={pageTitle} actions={importButtons}/>
    </div> : <div className="drive-review-heading">
      <div><strong>Importar CSV de Gallagher</strong><p>Seleccioná los archivos de tu computadora. Se identifican cliente, establecimiento y RENSPA por las caravanas ya cargadas.</p></div>
      {importButtons}
    </div>}
    {hasSharedCsv && <div className="csv-import-buttons">
      <button type="button" className="primary-button" disabled={busy || confirming || readingShare} onClick={() => void reviewSharedCsv()}>
        {readingShare ? "Revisando…" : "Revisar CSV compartido"}
      </button>
      {!confirming && <Link className="text-button" to="/hacienda" replace>Cerrar archivo compartido</Link>}
    </div>}
    {shareError && <div className="form-error" role="alert">{shareError}</div>}
    {busy && <div className="drive-review-progress" role="status"><span>{progress}</span><button type="button" className="text-button" onClick={() => request.current?.abort()}><X size={15}/>Cancelar revisión</button></div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    {reviews&&!emptyNotice&&<CsvImportDialog files={reviews} confirmed={confirmed} errors={fileErrors} busy={confirming} progress={batchProgress} canConfirm={profile?.role==="super_admin"} onConfirm={()=>void confirmBatch()} onReview={()=>void review(sourceFiles.current)} onCancel={()=>{if(saving.current)return;setReviews(null);setFileId("");setError("");setBatchReport(null);sourceFiles.current=[]}}/>}
  </section>
}
