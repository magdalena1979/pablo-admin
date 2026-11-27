import { useEffect, useRef, useState } from "react"
import { AppSelect } from "@/components/ui/AppSelect"
import { formatLivestockDate } from "./livestock-date"
import { HealthPlanPanel } from "./HealthPlanPanel"
import {
  importedHealthPageSize, loadAtosaIdentification, loadImportedHealth, loadImportedHealthPage, saveAtosaIdentification,
  type ImportedHealthPage, type ImportedHealthRecord, type ImportedHealthSource,
} from "./imported-health.service"

const sourceKey = (row: ImportedHealthSource) => JSON.stringify([row.importId, row.date])

export function CriaHealth({ farmId, renspaId, active }: { farmId: string; renspaId: string; active: boolean }) {
  const [loaded, setLoaded] = useState<{ key: string; type: string; result: ImportedHealthPage } | null>(null)
  const legacyRecords = useRef<ImportedHealthRecord[] | null>(null)
  const lastRead = useRef<{ key: string; at: number } | null>(null)
  const [filter, setFilter] = useState<ImportedHealthRecord["type"]>("sangrado")
  const [showPlan, setShowPlan] = useState(false)
  const [error, setError] = useState("")
  const [source, setSource] = useState<ImportedHealthSource>()
  const [attempt, retry] = useState(0)
  const [page, setPage] = useState(1)

  const requestKey = JSON.stringify([farmId, renspaId, filter, source, page, attempt])
  useEffect(() => {
    if (!active || showPlan || (lastRead.current?.key === requestKey && Date.now() - lastRead.current.at < 30_000)) return
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)])
    setError("")
    async function load() {
      let result = legacyRecords.current ? null : await loadImportedHealthPage(farmId, renspaId, filter, source, page, signal)
      if (!result) {
        const previous = legacyRecords.current ?? await loadImportedHealth(farmId, renspaId, signal)
        if (controller.signal.aborted) return
        legacyRecords.current = previous
        const byType = previous.filter(row => row.type === filter)
        const sources = [...new Map(byType.map(row => [sourceKey(row), row])).values()]
        const matching = source ? byType.filter(row => sourceKey(row) === sourceKey(source)) : byType
        result = {
          total: matching.length, sources,
          rows: matching.slice((page - 1) * importedHealthPageSize, page * importedHealthPageSize),
        }
      }
      if (!controller.signal.aborted) {
        lastRead.current = { key: requestKey, at: Date.now() }
        setLoaded({ key: requestKey, type: filter, result })
      }
    }
    void load().catch(cause => {
      if (!controller.signal.aborted) {
        const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : ""
        setError(signal.aborted ? "La consulta de sanidad tardó demasiado." :
          `No pudimos cargar los registros de sanidad.${code ? ` (${code})` : ""}`)
      }
    })
    return () => controller.abort()
  }, [active, showPlan, farmId, renspaId, filter, source, page, requestKey])

  const records = loaded?.key === requestKey ? loaded.result : null
  const sources = new Map((loaded?.type === filter ? loaded.result.sources : []).map(row => [sourceKey(row), row]))
  const selectedSource = source
  const pages = Math.max(1, Math.ceil((records?.total ?? 0) / importedHealthPageSize))

  function pickType(type: ImportedHealthRecord["type"]) {
    setShowPlan(false)
    if (type === filter) return
    setFilter(type)
    setSource(undefined)
    setPage(1)
  }

  return <section className="panel cria-section cria-health-panel" aria-label="Sanidad del establecimiento">
    <div className="cria-health-options" role="group" aria-label="Tipo de registro sanitario">
      <button type="button" className="cria-health-option" aria-pressed={!showPlan && filter === "sangrado"} onClick={() => pickType("sangrado")}>
        <strong>Sangrados</strong>
        <small>Muestras para brucelosis</small>
      </button>
      <button type="button" className="cria-health-option" aria-pressed={!showPlan && filter === "atosa"} onClick={() => pickType("atosa")}>
        <strong>ATOSA</strong>
        <small>Identificación por archivo</small>
      </button>
      <button type="button" className="cria-health-option" aria-pressed={showPlan} onClick={() => setShowPlan(true)}>
        <strong>Plan sanitario</strong>
        <small>Trabajos por grupo de animales</small>
      </button>
    </div>
    {showPlan ? active && <HealthPlanPanel farmId={farmId}/> : <>
    {(sources.size > 1 || (filter === "atosa" && sources.size > 0)) && <label className="form-field cria-tacto-picker">Fecha y archivo
      <AppSelect value={source ? sourceKey(source) : ""} onChange={event => { setSource(sources.get(event.target.value)); setPage(1) }}>
        <option value="">Todos los archivos</option>
        {[...sources].map(([key, row]) => <option key={key} value={key}>
          {formatLivestockDate(row.date)} · {row.filename}
        </option>)}
      </AppSelect>
    </label>}
    {filter === "atosa" && (selectedSource || records) && (selectedSource
      ? <AtosaIdentification key={sourceKey(selectedSource)} record={selectedSource}/>
      : <p>Elegí una fecha y un archivo para registrar la vacuna o el protocolo que confirmó Pablo.</p>)}
    {error ? <div className="data-error" role="alert">{error}
      <button type="button" className="secondary-button" onClick={() => retry(value => value + 1)}>Reintentar</button>
    </div> : !records ? <p role="status">Cargando registros de sanidad…</p> : <>
      <p>{records.total} {records.total === 1 ? "registro" : "registros"}</p>
      <div className="table-wrap"><table className="data-table" aria-label="Registros de sanidad de Gallagher">
        <thead><tr><th scope="col">Fecha</th><th scope="col">Caravana</th><th scope="col">{filter === "atosa" ? "Valor del CSV" : "Registro"}</th><th scope="col">CSV de origen</th></tr></thead>
        <tbody>
          {records.rows.map(row => <tr key={row.id}>
            <td>{formatLivestockDate(row.date)}</td><td>{row.tag || "—"}</td>
            <td>{row.type === "sangrado" ? "Muestra tomada" : row.original}</td>
            <td>{row.filename}</td>
          </tr>)}
          {!records.rows.length && <tr><td colSpan={4}>No hay registros de este tipo para la selección.</td></tr>}
        </tbody>
      </table></div>
      {pages > 1 && <nav className="animal-pagination" aria-label="Paginación de registros de sanidad">
        <button type="button" className="secondary-button" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page} de {pages}</span>
        <button type="button" className="secondary-button" disabled={page === pages} onClick={() => setPage(page + 1)}>Siguiente</button>
      </nav>}
    </>}
    </>}
  </section>
}

function AtosaIdentification({ record }: { record: ImportedHealthSource }) {
  const [description, setDescription] = useState<string | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [attempt, retry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setError("")
    void loadAtosaIdentification(record.importId, record.date, controller.signal).then(value => {
      if (!controller.signal.aborted) setDescription(value)
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No pudimos cargar la identificación.")
    })
    return () => controller.abort()
  }, [record.importId, record.date, attempt])

  async function save() {
    const value = draft?.trim()
    if (!value || saving) return
    setSaving(true)
    setError("")
    try {
      await saveAtosaIdentification(record.importId, record.date, value)
      setDescription(value)
      setDraft(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar la identificación.")
    } finally {
      setSaving(false)
    }
  }

  return <div className="cria-missing-results">
    <h4>Identificación de ATOSA</h4>
    <p>{formatLivestockDate(record.date)} · {record.filename}</p>
    {error && <p role="alert">{error}</p>}
    {description === null ? error
      ? <button className="secondary-button" type="button" onClick={() => retry(value => value + 1)}>Reintentar</button>
      : <p role="status">Cargando identificación…</p>
      : draft === null ? <>
        <p><strong>{description || "Pendiente de identificar"}</strong></p>
        <button className="secondary-button" type="button" onClick={() => setDraft(description)}>
          {description ? "Editar identificación" : "Registrar vacuna o protocolo"}
        </button>
      </> : <form onSubmit={event => { event.preventDefault(); void save() }}>
        <label className="form-field cria-tacto-picker">Vacuna o protocolo confirmado
          <input value={draft} onChange={event => setDraft(event.target.value)} required maxLength={200} disabled={saving}/>
        </label>
        <div className="cria-actions">
          <button className="primary-button" type="submit" disabled={saving || !draft.trim()}>{saving ? "Guardando…" : "Guardar identificación"}</button>
          <button className="secondary-button" type="button" disabled={saving} onClick={() => { setDraft(null); setError("") }}>Cancelar</button>
        </div>
      </form>}
  </div>
}
