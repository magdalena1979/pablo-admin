import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AppSelect } from "@/components/ui/AppSelect"
import { findTactos, loadTactoResults } from "./cria-tacto.service"
import { formatLivestockDate } from "./livestock-date"
import { saleShortlist, type SaleCandidate } from "./sale-shortlist.service"
import { latestTactoWithResults, type TactoResult } from "./cria-tacto"
import "./cria-overview.css"

const resultLabels = {
  vacia: "Vacías",
  pendiente: "Sin diagnóstico interpretable",
  prenada: "Preñadas",
  sangrado: "Sangrado para brucelosis",
} as const
const pageSize = 20
type Result = TactoResult | "sangrado"
type TactoResults = Awaited<ReturnType<typeof loadTactoResults>>

export function CriaOverview({ farmId, renspaId, worksUrl }: { farmId: string; renspaId: string; worksUrl: string }) {
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof findTactos>> | null>(null)
  const [sessionId, setSessionId] = useState("")
  const [results, setResults] = useState<{ request: string; sessionId: string; data: TactoResults } | null>(null)
  const [sessionError, setSessionError] = useState("")
  const [resultError, setResultError] = useState("")
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<Result>("vacia")
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [salePage, setSalePage] = useState(1)
  const [candidates, setCandidates] = useState<SaleCandidate[] | null>(null)
  const [showSaleList, setShowSaleList] = useState(false)
  const [saleError, setSaleError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [notice, setNotice] = useState("")
  const [saleAttempt, setSaleAttempt] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setSessionError("")
    void findTactos(farmId, renspaId, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]))
      .then(rows => { if (!controller.signal.aborted) setSessions(rows) })
      .catch(() => { if (!controller.signal.aborted) setSessionError("No pudimos cargar las jornadas de tacto.") })
    return () => controller.abort()
  }, [farmId, renspaId, attempt])

  const currentResults = results?.request === sessionId ? results : null
  const current = sessions?.find(row => row.id === (sessionId || currentResults?.sessionId))
  const currentId = current?.id

  useEffect(() => {
    if (!sessions?.length) return
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)])
    setResultError("")
    async function load() {
      const loadResults = (id: string) => loadTactoResults(farmId, id, renspaId, signal)
      const explicit = sessions?.find(row => row.id === sessionId)
      const next = explicit
        ? { session: explicit, data: await loadResults(explicit.id) }
        : await latestTactoWithResults(sessions ?? [], row => loadResults(row.id))
      if (!controller.signal.aborted && next) {
        setResults({ request: sessionId, sessionId: next.session.id, data: next.data })
      }
    }
    void load().catch(() => {
      if (!controller.signal.aborted) setResultError("No pudimos cargar los resultados del tacto.")
    })
    return () => controller.abort()
  }, [farmId, renspaId, sessions, sessionId, attempt])

  useEffect(() => {
    const controller = new AbortController()
    setSaleError("")
    void saleShortlist.list(farmId, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]))
      .then(rows => { if (!controller.signal.aborted) setCandidates(rows) })
      .catch(cause => {
        if (!controller.signal.aborted) setSaleError(cause instanceof Error ? cause.message : "No pudimos cargar la lista de venta.")
      })
    return () => controller.abort()
  }, [farmId, saleAttempt])

  const data = currentResults?.sessionId === currentId ? currentResults?.data : null
  const total = data ? data.vacia.length + data.prenada.length + data.pendiente.length : 0
  const missing = data?.pendiente.filter(row => !row.recorded).length ?? 0
  const noGestation = total > 0 && total === missing
  const animals = data?.[selected] ?? []
  const inSaleList = new Set(candidates?.map(row => row.animalId))
  const pages = Math.max(1, Math.ceil(animals.length / pageSize))
  const salePages = Math.max(1, Math.ceil((candidates?.length ?? 0) / pageSize))
  const currentSalePage = Math.min(salePage, salePages)
  const selectForSale = (selected === "vacia" || selected === "prenada") && candidates !== null && !saleError

  function changeResult(result: Result) {
    setSelected(result)
    setChecked(new Set())
    setPage(1)
    setNotice("")
  }

  async function addCandidates() {
    if (saving || !currentId || !selectForSale || noGestation || !checked.size) return
    const ids = animals.filter(row => checked.has(row.id) && !inSaleList.has(row.id)).map(row => row.id)
    if (!ids.length) return
    setSaving(true)
    setSaveError("")
    setNotice("")
    try {
      await saleShortlist.add(farmId, currentId, ids)
      setChecked(new Set())
      setSalePage(1)
      setSaleAttempt(value => value + 1)
      setNotice(ids.length === 1 ? "Se agregó 1 animal a la lista de venta." : `Se agregaron ${ids.length} animales a la lista de venta.`)
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "No se pudo guardar la selección.")
    } finally {
      setSaving(false)
    }
  }

  async function removeCandidate(animalId: string) {
    if (saving) return
    setSaving(true)
    setSaveError("")
    setNotice("")
    try {
      await saleShortlist.remove(farmId, animalId)
      setCandidates(previous => previous?.filter(row => row.animalId !== animalId) ?? null)
      setSaleAttempt(value => value + 1)
      setNotice("Se quitó el animal de la lista de venta.")
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "No se pudo quitar el animal.")
    } finally {
      setSaving(false)
    }
  }

  return <div className="cria-overview">
    <section className="panel cria-section" aria-labelledby="cria-work-title">
      <header className="cria-section-header">
        <h3 id="cria-work-title">{showSaleList ? "Lista de venta" : "Resultados de tacto"}</h3>
        <div className="cria-actions">
          <button type="button" className="secondary-button" disabled={saving} onClick={() => setShowSaleList(value => !value)}>
            {showSaleList ? "Volver al tacto" : `Lista de venta${candidates ? ` (${candidates.length})` : ""}`}
          </button>
          <Link className="secondary-button" to={worksUrl}>Ver jornadas</Link>
        </div>
      </header>

      {saveError && <p className="form-error" role="alert">{saveError}</p>}
      {notice && <p role="status">{notice}</p>}
      {saleError && <div className="data-error" role="alert">{saleError}
        <button className="secondary-button" type="button" onClick={() => setSaleAttempt(value => value + 1)}>Reintentar lista</button>
      </div>}

      {showSaleList ? <>
        <p>Selección para evaluar o apartar. La venta y la salida se registran por separado.</p>
        {!candidates ? !saleError && <p role="status">Cargando lista de venta…</p> : <div className="table-wrap">
          <table className="data-table" aria-label="Animales seleccionados para venta">
            <thead><tr><th scope="col">Caravana</th><th scope="col">EID</th><th scope="col">Agregado el</th><th scope="col">Acción</th></tr></thead>
            <tbody>
              {candidates.slice((currentSalePage - 1) * pageSize, currentSalePage * pageSize).map(row => <tr key={row.animalId}>
                <td>{row.tag || "—"}</td><td>{row.eid || "—"}</td><td>{formatLivestockDate(row.selectedAt)}</td>
                <td><button type="button" className="table-action" disabled={saving}
                  aria-label={`Quitar caravana ${row.tag || row.eid} de la lista`} onClick={() => void removeCandidate(row.animalId)}>Quitar</button></td>
              </tr>)}
              {!candidates.length && <tr><td colSpan={4}>Todavía no hay animales en la lista.</td></tr>}
            </tbody>
          </table>
        </div>}
        <Pagination page={currentSalePage} pages={salePages} onChange={setSalePage}/>
      </> : <>
        {sessionError || resultError ? <div className="data-error" role="alert">{sessionError || resultError}
          <button type="button" className="secondary-button" onClick={() => setAttempt(value => value + 1)}>Reintentar</button>
        </div> : !sessions ? <p role="status">Cargando jornadas de tacto…</p>
          : !sessions.length ? <p>Todavía no hay jornadas clasificadas como tacto.</p>
          : !current ? <p role="status">Buscando el último tacto con resultados…</p> : <>
            <label className="form-field cria-tacto-picker">Jornada de tacto
              <AppSelect value={current.id} disabled={saving} onChange={event => {
                setSessionId(event.target.value)
                setResultError("")
                changeResult("vacia")
              }}>
                {sessions.map(session => {
                  const herd = Array.isArray(session.herds) ? session.herds[0]?.name : session.herds?.name
                  const title = session.title.replace(/^(?:otro|tacto)\s*·\s*/i, "")
                  return <option key={session.id} value={session.id}>{[formatLivestockDate(session.session_date), herd, title].filter(Boolean).join(" · ")}</option>
                })}
              </AppSelect>
            </label>
            {!data ? <p role="status">Cargando resultados…</p> : !total ? <p>Esta jornada no tiene lecturas vinculadas para esta selección.</p> : <>
              {noGestation ? <div className="cria-missing-results">
                <h4>Esta jornada no tiene resultados de tacto</h4>
                <p>Hay {total} animales vinculados al archivo, todos sin dato de gestación.</p>
                <p>Para consultar preñadas o vacías, elegí otra jornada en el selector de arriba. Si este archivo corresponde a otro trabajo, corregí su tipo desde Trabajos realizados.</p>
                <Link className="secondary-button" to={worksUrl}>Ir a Trabajos realizados</Link>
              </div> : <div className="cria-results" aria-label="Resultados del tacto">
                {(["vacia", "prenada", "pendiente"] as const).filter(result => result !== "pendiente" || data.pendiente.length > 0).map(result =>
                  <button key={result} type="button" className="cria-result" disabled={saving}
                    aria-pressed={selected === result} onClick={() => changeResult(result)}>
                    <strong>{data[result].length}</strong><span>{resultLabels[result]}</span>
                  </button>)}
              </div>}
              {data.sangrado.length > 0 && <p><button type="button" className="secondary-button" disabled={saving} aria-pressed={selected === "sangrado"}
                onClick={() => changeResult("sangrado")}>Sangrado para brucelosis · {data.sangrado.length}</button></p>}
              {(!noGestation || selected === "sangrado") && <>
              <div className="cria-selection-heading">
                <h4>{resultLabels[selected]}</h4>
                {selectForSale && checked.size > 0 && <button type="button" className="primary-button" disabled={saving}
                  onClick={() => void addCandidates()}>{saving ? "Guardando…" : `Agregar a lista de venta (${checked.size})`}</button>}
              </div>
              {selected === "pendiente" && <div className="cria-missing-results">
                {missing > 0 && <p><strong>{missing} sin dato.</strong> Consultá la planilla de la jornada si necesitás recuperar esos resultados.</p>}
                {data.pendiente.length > missing && <p><strong>{data.pendiente.length - missing} con valores ambiguos o contradictorios.</strong> Compará el registro original de cada caravana con la planilla de la jornada.</p>}
              </div>}
              <div className="table-wrap"><table className="data-table" aria-label={resultLabels[selected]}>
                <thead><tr>{selectForSale && <th scope="col">Selección</th>}<th scope="col">Caravana</th><th scope="col">EID</th><th scope="col">Registro original</th></tr></thead>
                <tbody>
                  {animals.slice((page - 1) * pageSize, page * pageSize).map(row => <tr key={row.id}>
                    {selectForSale && <td>{inSaleList.has(row.id) ? "En lista" :
                      <input type="checkbox" aria-label={`Seleccionar caravana ${row.tag || row.eid}`}
                        checked={checked.has(row.id)} disabled={saving} onChange={event => {
                          const isChecked = event.target.checked
                          setChecked(previous => {
                            const next = new Set(previous)
                            if (isChecked) next.add(row.id)
                            else next.delete(row.id)
                            return next
                          })
                        }}/>}</td>}
                    <td>{row.tag || "—"}</td><td>{row.eid || "—"}</td><td>{row.recorded || "Gestación sin registrar"}</td>
                  </tr>)}
                  {!animals.length && <tr><td colSpan={selectForSale ? 4 : 3}>No hay animales en este grupo.</td></tr>}
                </tbody>
              </table></div>
              <Pagination page={page} pages={pages} onChange={setPage}/>
              </>}
            </>}
          </>}
      </>}
    </section>
  </div>
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange(page: number): void }) {
  if (pages <= 1) return null
  return <nav className="animal-pagination" aria-label="Paginación de animales">
    <button type="button" className="secondary-button" disabled={page === 1} onClick={() => onChange(page - 1)}>Anterior</button>
    <span>Página {page} de {pages}</span>
    <button type="button" className="secondary-button" disabled={page === pages} onClick={() => onChange(page + 1)}>Siguiente</button>
  </nav>
}
