import { AppSelect } from "@/components/ui/AppSelect"
import { useEffect, useRef, useState } from "react"
import { RefreshCw, X } from "lucide-react"
import { GALLAGHER_FOLDER_URL, isDriveConfigured, prepareDriveConnection } from "@/services/google-drive-read.service"
import { reviewGallagherDrive, type DriveFileReview } from "@/services/gallagher-drive-preview.service"
import "./drive-review.css"

const labels = { coincidencia: "Coincidencia", conflicto: "Conflicto", sin_alta: "Sin alta previa", error: "Error" }
export function DriveUpdatePanel() {
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState("")
  const [error, setError] = useState(""), [reviews, setReviews] = useState<DriveFileReview[] | null>(null)
  const [fileId, setFileId] = useState("")
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    if (isDriveConfigured()) void prepareDriveConnection().catch(() => undefined)
    return () => request.current?.abort()
  }, [])
  async function update() {
    if (request.current) return
    if (!isDriveConfigured()) { setError("La conexión de esta aplicación con Google Drive todavía no está habilitada. No se leyeron archivos ni se modificaron caravanas."); return }
    const controller = new AbortController(); request.current = controller
    setBusy(true); setError(""); setReviews(null); setFileId("")
    try {
      const next = await reviewGallagherDrive(controller.signal, setProgress)
      if (controller.signal.aborted) return
      setReviews(next)
      setFileId(next.find(review => review.file.name === "2025-05-10 TOROS 2.csv")?.file.id ?? next[0]?.file.id ?? "")
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "No pudimos actualizar desde Drive.")
    } finally { if (request.current === controller) { request.current = null; setBusy(false); setProgress("") } }
  }
  const selected = reviews?.find(review => review.file.id === fileId)
  const rows = reviews?.flatMap(review => review.rows) ?? []
  return <section className="drive-review-panel" aria-label="Revisión de CSV de Drive">
    <div className="drive-review-heading"><div><strong>CSV de Gallagher</strong><p>Buscá las lecturas en las caravanas cargadas, con su cliente, establecimiento y RENSPA.</p><a href={GALLAGHER_FOLDER_URL} target="_blank" rel="noreferrer">Abrir carpeta de Drive</a></div><button type="button" className="primary-button" disabled={busy} onClick={() => void update()}><RefreshCw size={17}/>{busy ? "Actualizando…" : "Actualizar"}</button></div>
    {busy && <div className="drive-review-progress" role="status"><span>{progress}</span><button type="button" className="text-button" onClick={() => request.current?.abort()}><X size={15}/>Cancelar revisión</button></div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    {reviews && <>
      <div className="drive-review-summary"><span><strong>{reviews.length}</strong> CSV</span><span><strong>{rows.filter(row => row.result === "coincidencia").length}</strong> lecturas con coincidencia</span><span><strong>{rows.filter(row => row.result !== "coincidencia").length}</strong> lecturas a revisar</span><span><strong>{reviews.filter(review => review.error).length}</strong> archivos con error</span></div>
      <p className="drive-review-notice" role="status">Revisión de solo lectura: no se crearon animales, no se guardaron vínculos ni se cambió el estado de las caravanas.</p>
      {!reviews.length ? <p>No encontramos archivos CSV en esta carpeta.</p> : <>
        <label className="drive-file-selector">Archivo<AppSelect value={fileId} onChange={event => setFileId(event.target.value)}>{reviews.map(review => <option key={review.file.id} value={review.file.id}>{review.file.name} · {review.error ? "Error" : review.empty ? "Sin registros" : `${review.rows.filter(row => row.result === "coincidencia").length}/${review.rows.length} coincidencias`}</option>)}</AppSelect></label>
        {selected && <><div className="drive-file-caption"><strong>{selected.file.name}</strong><a href={`https://drive.google.com/file/d/${encodeURIComponent(selected.file.id)}/view`} target="_blank" rel="noreferrer">Ver en Drive</a></div>
          {selected.error ? <div className="form-error">{selected.error}</div> : selected.empty ? <p>Este CSV contiene encabezados, pero no tiene registros.</p> : <div className="table-wrap drive-matches"><table className="data-table"><thead><tr><th>Fila</th><th>EID</th><th>Caravana visual</th><th>Fecha / hora CSV</th><th>Cliente</th><th>Establecimiento</th><th>RENSPA</th><th>Sexo del rango</th><th>Estado actual</th><th>Resultado</th></tr></thead><tbody>{selected.rows.map(row => <tr key={row.row}><td>{row.row}</td><td className="drive-eid">{row.eid || "—"}</td><td>{row.tag || "—"}</td><td>{row.date || "Sin fecha"}<small className="cell-note">{row.time}</small></td><td>{row.registration?.client || "—"}</td><td>{row.registration?.farm || "—"}</td><td>{row.registration?.renspa || "—"}</td><td>{row.registration?.sex || "—"}</td><td>{row.registration?.status || "—"}</td><td><strong className={`drive-result drive-result-${row.result}`}>{labels[row.result]}</strong><small className="cell-note">{row.detail}</small></td></tr>)}</tbody></table></div>}
        </>}
      </>}
    </>}
  </section>
}
