import { AppSelect } from "@/components/ui/AppSelect"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { Navigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/app/providers/AuthProvider"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"
import { Badge, PageHeader } from "@/components/ui/Presentation"
import { createRequestId } from "@/lib/request-id"
import { professionalWorksService, type InvoiceDetails } from "@/services/professional-works.service"

type Works = Awaited<ReturnType<typeof professionalWorksService.list>>
type Sessions = Awaited<ReturnType<typeof professionalWorksService.availableSessions>>

function first<T>(relation: T | T[] | null | undefined): T | undefined {
  return Array.isArray(relation) ? relation[0] : relation ?? undefined
}

function formatDate(value: string) {
  return value.slice(0, 10).split("-").reverse().join("/")
}

function errorMessage(cause: unknown, fallback: string) {
  return cause && typeof cause === "object" && "message" in cause ? String(cause.message) : fallback
}

export function ProfessionalWorksPage() {
  const { profile } = useAuth()
  return profile?.role === "super_admin" ? <WorksTable /> : <Navigate to="/inicio" replace />
}

function WorksTable() {
  const { farms, loading: loadingFarms } = useFarmScope()
  const [works, setWorks] = useState<Works>([])
  const [sessions, setSessions] = useState<Sessions>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [changeError, setChangeError] = useState("")
  const [invoiceNotice, setInvoiceNotice] = useState("")
  const [reload, setReload] = useState(0)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Works[number] | null>(null)
  const [updating, setUpdating] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [invoicing, setInvoicing] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const farmFilter = params.get("establecimiento") ?? ""
  const [status, setStatus] = useState("")
  const farmById = new Map(farms.map(farm => [farm.id, farm]))

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError("")
    void Promise.all([professionalWorksService.list(), professionalWorksService.availableSessions(controller.signal)]).then(([works, sessions]) => {
      if (controller.signal.aborted) return
      setWorks(works)
      setSessions(sessions)
    }).catch(cause => {
      if (!controller.signal.aborted) setLoadError(errorMessage(cause, "No pudimos cargar los trabajos."))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [reload])

  async function toggleInvoice(work: Works[number]) {
    setUpdating(work.id)
    setChangeError("")
    try {
      await professionalWorksService.setInvoiced(work.id, !work.invoiced)
      setWorks(rows => rows.map(row => row.id === work.id ? { ...row, invoiced: !work.invoiced } : row))
    } catch (cause) {
      setChangeError(errorMessage(cause, "No pudimos cambiar el estado de facturación."))
    } finally {
      setUpdating("")
    }
  }

  const linkedIds = new Set(works.flatMap(work => work.professional_work_sessions.map(link => link.session_id)))
  const rows = [
    ...works.map(work => ({
      key: `work:${work.id}`, date: work.work_date, farmId: work.farm_id, clientId: first(work.farms)?.client_id ?? "",
      description: work.description, count: work.professional_work_sessions.length, invoiced: work.invoiced,
      work, sessionId: "", invoiceNumber: first(first(work.professional_invoice_works)?.professional_invoices)?.invoice_number ?? "",
    })),
    ...sessions.filter(session => !linkedIds.has(session.id)).map(session => ({
      key: `session:${session.id}`, date: session.session_date, farmId: session.farm_id, clientId: first(session.farms)?.client_id ?? "",
      description: session.title || "Sesión Gallagher", count: 1, invoiced: false, work: null, sessionId: session.id, invoiceNumber: "",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key))
  const visible = rows.filter(row => (!farmFilter || row.farmId === farmFilter)
    && (!status || row.invoiced === (status === "facturado")))
  const selected = rows.filter(row => !row.invoiced && selectedKeys.includes(row.key))
  const selectedClient = selected[0]?.clientId
  const selectedClientName = selected.length ? farmById.get(selected[0].farmId)?.clientName : undefined

  async function invoiceSelected(invoice: InvoiceDetails) {
    if (!selectedClient || invoicing) return
    setInvoicing(true)
    setChangeError("")
    setInvoiceNotice("")
    try {
      await professionalWorksService.recordInvoice(
        invoice, selectedClient, selected.flatMap(row => row.work ? [row.work.id] : []),
        selected.flatMap(row => row.sessionId ? [row.sessionId] : []),
      )
      setSelectedKeys([])
      setInvoiceOpen(false)
      setInvoiceNotice(`Factura ${invoice.number} registrada para ${selected.length} ${selected.length === 1 ? "trabajo" : "trabajos"}.`)
      setReload(value => value + 1)
    } finally {
      setInvoicing(false)
    }
  }

  return <section className="page compact-list-page">
    <div className="compact-list-heading">
      <PageHeader title="Trabajos" actions={<><button type="button" className="primary-button"
        disabled={loading || loadingFarms || !farms.length || Boolean(loadError)}
        onClick={() => setCreating(true)}><Plus size={17} aria-hidden="true"/>Trabajo manual</button>
        <button type="button" className="secondary-button"
          disabled={!selectedClient || loading || invoicing || Boolean(updating) || Boolean(loadError)}
          onClick={() => setInvoiceOpen(true)}>Registrar factura</button></>}/>
    </div>
    {changeError && <p className="form-error" role="alert">{changeError}</p>}
    {invoiceNotice && <div className="success-strip" role="status">{invoiceNotice}</div>}
    {loading ? <div className="loading-panel" role="status">Cargando trabajos…</div> : loadError ?
      <div className="data-error" role="alert">{loadError}
        <button type="button" className="secondary-button" onClick={() => setReload(value => value + 1)}>Reintentar</button>
      </div> : <>
        <div className="toolbar compact-list-filters">
          <AppSelect aria-label="Filtrar por establecimiento" value={farmFilter} onChange={event => {
            const next = new URLSearchParams(params)
            if (event.target.value) next.set("establecimiento", event.target.value)
            else next.delete("establecimiento")
            setParams(next, { replace: true })
          }}>
            <option value="">Todos los establecimientos</option>
            {farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name} · {farm.clientName}</option>)}
          </AppSelect>
          <AppSelect aria-label="Filtrar por facturación" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">Todos los estados</option><option value="pendiente">Pendientes</option><option value="facturado">Facturados</option>
          </AppSelect>
        </div>
        {selected.length > 0 && <div className="toolbar" role="status">
          {selected.length} {selected.length === 1 ? "seleccionado" : "seleccionados"}{selectedClientName && ` · ${selectedClientName}`}
        </div>}
        <div className="panel data-panel"><div className="table-wrap">
          <table className="data-table" aria-label="Trabajos profesionales">
            <thead><tr>
              <th scope="col">Facturar</th><th scope="col">Fecha</th><th scope="col">Cliente</th><th scope="col">Establecimiento</th>
              <th scope="col">Trabajo realizado</th><th scope="col">Sesiones Gallagher</th>
              <th scope="col">Facturación</th><th scope="col">N.º de factura</th><th scope="col">Acción</th>
            </tr></thead>
            <tbody>
              {visible.map(row => {
                const farm = farmById.get(row.farmId)
                const { work } = row
                const differentClient = Boolean(selectedClient && selectedClient !== row.clientId)
                return <tr key={row.key}>
                  <td>{!row.invoiced && <input type="checkbox" aria-label={`Seleccionar ${row.description} del ${formatDate(row.date)}`}
                    title={differentClient ? "La selección admite un solo cliente" : undefined}
                    checked={selectedKeys.includes(row.key)} disabled={invoicing || differentClient || !row.clientId}
                    onChange={event => {
                      const checked = event.target.checked
                      setSelectedKeys(keys => checked ? [...keys, row.key] : keys.filter(key => key !== row.key))
                    }}/>}</td>
                  <td>{formatDate(row.date)}</td><td>{farm?.clientName || "—"}</td><td>{farm?.name || "—"}</td>
                  <td>{row.description}</td><td>{row.count}</td>
                  <td><Badge tone={row.invoiced ? "success" : "warning"}>{row.invoiced ? "Facturado" : "Pendiente"}</Badge></td>
                  <td>{row.invoiceNumber || "—"}</td>
                  <td>{work && !row.invoiced && row.count === 0 && <button type="button" className="table-action"
                    disabled={invoicing || Boolean(updating)} onClick={() => setEditing(work)}>Editar</button>}
                  {work && row.invoiced && !row.invoiceNumber && <button type="button" className="text-button" disabled={invoicing || Boolean(updating)} onClick={() => void toggleInvoice(work)}>
                    {updating === work.id ? "Guardando…" : "Marcar pendiente"}
                  </button>}</td>
                </tr>
              })}
              {!visible.length && <tr><td colSpan={9}>{rows.length ? "No hay trabajos para estos filtros." : "Todavía no hay trabajos registrados."}</td></tr>}
            </tbody>
          </table>
        </div></div>
      </>}
    {(creating || editing) && <WorkDialog key={editing?.id ?? "new"} editing={editing ?? undefined}
      fixedFarm={editing ? { id: editing.farm_id, name: farmById.get(editing.farm_id)?.name || "Establecimiento actual" } : undefined}
      onClose={() => { setCreating(false); setEditing(null) }} onSaved={() => {
      setCreating(false); setEditing(null)
      setReload(value => value + 1)
    }}/>}
    {invoiceOpen && <InvoiceDialog client={selectedClientName} works={selected.map(row => ({
      key: row.key, description: row.description, date: row.date, farm: farmById.get(row.farmId)?.name,
    }))} saving={invoicing} onClose={() => setInvoiceOpen(false)} onSave={invoiceSelected}/>}
  </section>
}

function InvoiceDialog({ client, works, saving, onClose, onSave }: {
  client?: string
  works: { key: string; description: string; date: string; farm?: string }[]
  saving: boolean
  onClose(): void
  onSave(invoice: InvoiceDetails): Promise<void>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [id] = useState(createRequestId)
  const [number, setNumber] = useState("")
  const [date, setDate] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !number.trim() || !date || !works.length) return
    setError("")
    try {
      await onSave({ id, number: number.trim(), date, amount: amount === "" ? null : Number(amount), currency: currency || null })
    } catch (cause) {
      setError(errorMessage(cause, "No pudimos registrar la factura."))
    }
  }

  return <dialog ref={dialog} className="dialog-card" aria-labelledby="professional-invoice-title"
    onCancel={event => { event.preventDefault(); if (!saving) onClose() }}>
    <form onSubmit={event => void submit(event)}>
      <header className="dialog-header"><h2 id="professional-invoice-title">Registrar factura</h2></header>
      {client && <p><strong>{client}</strong></p>}
      <ul aria-label="Trabajos incluidos" style={{ maxHeight: "8rem", overflowY: "auto", marginBlock: "8px 16px" }}>
        {works.map(work => <li key={work.key}>
          {formatDate(work.date)} · {work.description}{work.farm && ` · ${work.farm}`}
        </li>)}
      </ul>
      <fieldset className="registration-inputs" disabled={saving}>
        <div className="form-grid">
          <label>N.º de factura<input required maxLength={80} value={number} onChange={event => setNumber(event.target.value)}/></label>
          <label>Fecha de factura<input type="date" required value={date} onChange={event => setDate(event.target.value)}/></label>
          <label>Importe (opcional)<input type="number" min="0" max="999999999999.99" step="0.01" value={amount} onChange={event => setAmount(event.target.value)}/></label>
          <label>Moneda (opcional)<input list="professional-invoice-currencies" pattern="[A-Z]{3}" maxLength={3}
            title="Código de tres letras de la moneda" placeholder="ARS, USD…" value={currency}
            onChange={event => setCurrency(event.target.value.trim().toUpperCase())}/></label>
          <datalist id="professional-invoice-currencies"><option value="ARS"/><option value="USD"/></datalist>
        </div>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="secondary-button" disabled={saving} onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={saving || !number.trim() || !date || !works.length}>{saving ? "Guardando…" : "Guardar factura"}</button>
      </div>
    </form>
  </dialog>
}

export function WorkDialog({ onClose, onSaved, fixedFarm, editing }: {
  onClose(): void; onSaved(): void; fixedFarm?: { id: string; name: string }
  editing?: Pick<Works[number], "id" | "work_date" | "description">
}) {
  const { farms } = useFarmScope()
  const dialog = useRef<HTMLDialogElement>(null)
  const [id] = useState(() => editing?.id ?? createRequestId())
  const [farmId, setFarmId] = useState(fixedFarm?.id ?? "")
  const [date, setDate] = useState(editing?.work_date ?? "")
  const [description, setDescription] = useState(editing?.description ?? "")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !description.trim()) return
    setSaving(true)
    setError("")
    try {
      const values = { id, date, description: description.trim() }
      if (editing) await professionalWorksService.editPending(values)
      else await professionalWorksService.create({ ...values, farmId })
      onSaved()
    } catch (cause) {
      setError(errorMessage(cause, "No pudimos guardar el trabajo."))
      setSaving(false)
    }
  }

  return <dialog ref={dialog} className="dialog-card" aria-labelledby="professional-work-title"
    onCancel={event => { event.preventDefault(); if (!saving) onClose() }}>
    <form onSubmit={event => void submit(event)}>
      <header className="dialog-header"><h2 id="professional-work-title">{editing ? "Editar trabajo manual" : "Registrar trabajo manual"}</h2></header>
      <fieldset className="registration-inputs" disabled={saving}>
        <div className="form-grid">
          <label>Establecimiento{fixedFarm ? <input readOnly value={fixedFarm.name}/> : <AppSelect required value={farmId} onChange={event => setFarmId(event.target.value)}>
            <option value="">Seleccionar establecimiento</option>
            {farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name} · {farm.clientName}</option>)}
          </AppSelect>}</label>
          <label>Fecha del trabajo<input type="date" required value={date} onChange={event => setDate(event.target.value)}/></label>
          <label className="span-2">Trabajo realizado<input required maxLength={200} placeholder="Por ejemplo, raspaje o tacto" value={description} onChange={event => setDescription(event.target.value)}/></label>
        </div>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="secondary-button" disabled={saving} onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={saving || !description.trim()}>{saving ? "Guardando…" : "Guardar trabajo"}</button>
      </div>
    </form>
  </dialog>
}
