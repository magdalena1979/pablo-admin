import { AppSelect } from "@/components/ui/AppSelect"
import { PageHeader } from "@/components/ui/Presentation"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { createRequestId } from "@/lib/request-id"
import { Tag, ArrowLeft, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"
import { clientsService, type ClientRecord } from "@/services/clients.service"
import { earTagsService, type BagInput, type TagReceipt } from "@/services/ear-tags.service"
import { summarizeTagReceipts } from "./ear-tag-receipts"
import { MAX_BAG_QUANTITY, lastEidFromQuantity, rangesFromQuantities, validateTagBag, type CheckedTagRange, type TagAllocation } from "./ear-tag-ranges"
import "./ear-tags.css"

function localDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}
function newBag(): BagInput {
  return { id: createRequestId(), renspaId: "", receivedOn: localDate(), first: "", last: "", declaredQuantity: "",
    ranges: [{ first: "", last: "", sex: "" }] }
}
function message(cause: unknown) {
  if (cause && typeof cause === "object" && "code" in cause && cause.code === "42501") return "No tenés permiso para recibir caravanas."
  return cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "No pudimos completar la operación. Intentá nuevamente."
}
export function EarTagsPage({ farmId = "", clientId = "", renspaId = "", onRenspaChange, backTo }: { farmId?: string; clientId?: string; renspaId?: string; onRenspaChange?(value: string): void; backTo?: string } = {}) {
  const { profile } = useAuth()
  const canReceive = profile?.role === "super_admin"
  const [params,setParams]=useSearchParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const receptionReturnTo = useRef<string | null>(null)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [receipts, setReceipts] = useState<TagReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saved, setSaved] = useState("")
  const [creating, setCreating] = useState(false)
  const [showLots, setShowLots] = useState(false)
  const [filterClient, setFilterClient] = useState("")
  const [filterFarm, setFilterFarm] = useState("")
  const [filterRenspa, setFilterRenspa] = useState("")
  const [filterSex, setFilterSex] = useState("")
  async function load() {
    setLoading(true); setLoadError("")
    try { const [nextClients, nextReceipts] = await Promise.all([clientsService.list(farmId || undefined), earTagsService.list()]); setClients(clientId ? nextClients.filter(row => row.id === clientId) : nextClients); setReceipts(nextReceipts) }
    catch (cause) { setLoadError(message(cause)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [farmId, clientId])
  useEffect(() => {
    if (!canReceive || loading || loadError || params.get("nueva") !== "1") return
    const origin = (state as { receptionReturnTo?: unknown } | null)?.receptionReturnTo
    if (!receptionReturnTo.current && typeof origin === "string" && /^\/(?![\/\\])/.test(origin)) {
      const returnUrl = new URL(origin, window.location.origin)
      returnUrl.searchParams.delete("nueva")
      receptionReturnTo.current = returnUrl.pathname + returnUrl.search + returnUrl.hash
    }
    setCreating(true)
    setShowLots(false)
    const next = new URLSearchParams(params)
    next.delete("nueva")
    setParams(next, { replace: true })
  }, [canReceive, loading, loadError, params, setParams, state])

  function finishReception(receiptId?: string) {
    const origin = receptionReturnTo.current ?? backTo
    receptionReturnTo.current = null
    setCreating(false)
    const confirmation = receiptId
      ? `Recepción guardada. Las caravanas quedaron disponibles. Referencia: ${receiptId.slice(0, 8)}`
      : ""
    if (origin) {
      navigate(origin, { replace: true, state: confirmation ? { earTagReceptionSaved: confirmation } : undefined })
    } else if (confirmation) {
      setSaved(confirmation)
      void load()
    }
  }
  const farms = clients.flatMap(client => client.farms.map(farm => ({
    ...farm, clientId: client.id, clientName: client.legalName,
  }))).filter(farm => !farmId || farm.id === farmId)
  const registrations = new Map(farms.flatMap(farm => farm.renspas.map(renspa => [renspa.id, { farm, renspa }] as const)))
  const filterFarms = farms.filter(farm => !filterClient || farm.clientId === filterClient)
  const filterRenspas = filterFarms.filter(farm => !filterFarm || farm.id === filterFarm).flatMap(farm => farm.renspas)
  const lots = receipts.flatMap(receipt => {
    const related = registrations.get(receipt.renspaId)
    if (farmId && !related) return []
    if (renspaId && receipt.renspaId !== renspaId) return []
    return [{ receipt, related }]
  })
  const receiptSummaries = summarizeTagReceipts(lots.map(({ receipt }) => receipt))
  const visible = lots.flatMap(({ receipt, related }) => {
    if ((renspaId || filterRenspa) && receipt.renspaId !== (renspaId || filterRenspa)) return []
    if (filterClient && related?.farm.clientId !== filterClient) return []
    if (filterFarm && related?.farm.id !== filterFarm) return []
    return receipt.ranges
      .filter(range => !filterSex || range.sex === filterSex)
      .map(range => ({ receipt, range, related }))
  })
  return <>
  {creating && <div hidden={showLots}><BagForm initialClientId={clientId} initialFarmId={farmId || (clientId && farms.length === 1 ? farms[0].id : "")} initialRenspaId={renspaId}
    clients={farmId ? clients.map(client => ({ ...client, farms: client.farms.filter(farm => farm.id === farmId) })).filter(client => client.farms.length) : clients}
    active={!showLots} onBackToLots={() => { setShowLots(true); window.scrollTo(0, 0) }}
    onClose={() => finishReception()} onSaved={finishReception}/></div>}
  {(!creating || showLots) && <section className="page ear-tags-page compact-list-page">
    <div className="compact-list-heading">
      {!farmId && <Link to={backTo ?? "/inicio"} className="text-button compact-back" aria-label={backTo ? "Volver al cliente" : "Volver a Inicio"}>
        <ArrowLeft size={20} aria-hidden="true"/>
      </Link>}
      <PageHeader title="Caravanas" icon={farmId ? <Tag size={27}/> : undefined} actions={canReceive && <button type="button" className="primary-button" aria-label={creating ? "Seguir cargando" : "Agregar recepción"} title="Agregar recepción" disabled={loading || Boolean(loadError)} onClick={() => { setSaved(""); setShowLots(false); setCreating(true) }}><Plus size={20} aria-hidden="true"/><span className="tag-mobile-create-label">{creating ? "Continuar" : "Agregar"}</span></button>}/>
    </div>
    {saved && <div className="success-strip" role="status">{saved}</div>}
    {loadError && <div className="data-error" role="alert"><strong>No pudimos cargar las recepciones</strong><span>{loadError}</span><button className="secondary-button" onClick={() => void load()}>Reintentar</button></div>}
    {loading ? <div className="loading-panel">Cargando caravanas…</div> : !loadError && <>
      <div className="toolbar compact-list-filters tag-list-filters">
        {!farmId && <>
          <AppSelect aria-label="Filtrar por cliente" value={filterClient} onChange={event => {
            setFilterClient(event.target.value); setFilterFarm(""); setFilterRenspa("")
          }}>
            <option value="">Todos los clientes</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.legalName}</option>)}
          </AppSelect>
          <AppSelect aria-label="Filtrar por establecimiento" value={filterFarm} onChange={event => {
            setFilterFarm(event.target.value); setFilterRenspa("")
          }}>
            <option value="">Todos los establecimientos</option>
            {filterFarms.map(farm => <option key={farm.id} value={farm.id}>{farm.name} · {farm.clientName}</option>)}
          </AppSelect>
        </>}
        {(onRenspaChange || !renspaId) && <AppSelect aria-label="Filtrar por RENSPA" value={renspaId || filterRenspa} onChange={event => (onRenspaChange ?? setFilterRenspa)(event.target.value)}>
          <option value="">RENSPA</option>
          {filterRenspas.map(renspa => <option key={renspa.id} value={renspa.id}>{renspa.number}</option>)}
        </AppSelect>}
        <AppSelect aria-label="Filtrar por destino" value={filterSex} onChange={event => setFilterSex(event.target.value)}>
          <option value="">Destino</option>
          <option value="macho">Machos</option>
          <option value="hembra">Hembras</option>
        </AppSelect>
      </div>
      <div className="panel data-panel tag-desktop-table">
        <div className="table-wrap">
          <table className="data-table" aria-label="Rangos de caravanas recibidas">
            <thead><tr>
              <th scope="col">Cliente</th><th scope="col">Establecimiento</th><th scope="col">RENSPA</th>
              <th scope="col">Fecha de recepción</th><th scope="col">Destino</th>
              <th scope="col">Desde EID</th><th scope="col">Hasta EID</th>
              <th scope="col">Cantidad recibida</th><th scope="col">Disponibles</th><th scope="col">Utilizadas</th>
            </tr></thead>
            <tbody>
              {visible.map(({ receipt, range, related }) => <tr key={`${receipt.id}:${range.first}`}>
                <td>{related?.farm.clientName || "—"}</td>
                <td>{related?.farm.name || "—"}</td>
                <td>{related?.renspa.number || "—"}</td>
                <td>{receipt.receivedOn.split("-").reverse().join("/")}</td>
                <td>{range.sex === "macho" ? "Machos" : "Hembras"}</td>
                <td className="tag-eid">{range.first}</td><td className="tag-eid">{range.last}</td>
                <td>{range.quantity}</td><td>{range.available}</td><td>{range.used}</td>
              </tr>)}
              {!visible.length && <tr><td colSpan={10}>No hay rangos de caravanas para mostrar.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel data-panel tag-mobile-lots">
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Recepciones de caravanas con desplazamiento horizontal">
        <table className="data-table" aria-label="Recepciones de caravanas">
          <thead><tr>
            <th scope="col">Fecha</th>
            {!farmId && <th scope="col">Campo</th>}
            <th scope="col">Desde EID</th><th scope="col">Hasta EID</th>
            <th scope="col">Total</th><th scope="col">Machos</th><th scope="col">Hembras</th>
          </tr></thead>
          <tbody>
            {receiptSummaries.map(receipt => <tr key={receipt.id}>
              <td><time dateTime={receipt.receivedOn}>{receipt.receivedOn.split("-").reverse().join("/")}</time></td>
              {!farmId && <td>{registrations.get(receipt.renspaId)?.farm.name || "—"}</td>}
              <td className="tag-eid">{receipt.first}</td><td className="tag-eid">{receipt.last}</td>
              <td><strong>{receipt.total}</strong>{receipt.hasGaps && <small className="tag-gap-note">Con saltos</small>}</td>
              <td>{receipt.male}</td><td>{receipt.female}</td>
            </tr>)}
            {!receiptSummaries.length && <tr><td colSpan={farmId ? 6 : 7}>No hay recepciones para mostrar.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </>}
  </section>}
  </>
}

function BagForm({ clients, onClose, onSaved, active, onBackToLots, initialClientId = "", initialFarmId = "", initialRenspaId = "" }: {
  clients: ClientRecord[]; onClose(): void; onSaved(id: string): void
  active: boolean; onBackToLots(): void; initialClientId?: string; initialFarmId?: string; initialRenspaId?: string
}) {
  const title = useRef<HTMLHeadingElement>(null)
  const reviewSummary = useRef<HTMLElement>(null)
  const formError = useRef<HTMLDivElement>(null)
  const scopedFarm = clients.flatMap(client => client.farms).find(farm => farm.id === initialFarmId)
  const scopedRenspa = scopedFarm?.renspas.find(renspa => renspa.id === initialRenspaId)
    ?? (scopedFarm?.renspas.length === 1 ? scopedFarm.renspas[0] : undefined)
  const [draft, setDraft] = useState(() => ({ ...newBag(), renspaId: scopedRenspa?.id ?? "" }))
  const [allocations, setAllocations] = useState<TagAllocation[]>([{ quantity: "", sex: "" }])
  const [clientId, setClientId] = useState(() => clients.find(client => client.farms.some(farm => farm.id === initialFarmId))?.id || initialClientId)
  const [farmId, setFarmId] = useState(initialFarmId)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches)
  const [step, setStep] = useState<1 | 2>(1)
  const busy = useRef(false)
  const [review, setReview] = useState<ReturnType<typeof validateTagBag> | null>(null)
  useEffect(() => {
    const breakpoint = window.matchMedia("(max-width: 760px)")
    const update = () => setMobile(breakpoint.matches)
    breakpoint.addEventListener("change", update)
    return () => breakpoint.removeEventListener("change", update)
  }, [])
  useEffect(() => {
    if (!active) return
    window.scrollTo(0, 0)
    title.current?.focus({ preventScroll: true })
  }, [active, step])
  useEffect(() => {
    if (active && review) reviewSummary.current?.scrollIntoView({ block: "nearest" })
  }, [active, review])
  useEffect(() => {
    if (error) formError.current?.scrollIntoView({ block: "nearest" })
  }, [error])
  const selectedClient = clients.find(client => client.id === clientId)
  const farms = selectedClient?.farms ?? []
  const selectedFarm = farms.find(farm => farm.id === farmId)
  const renspas = selectedFarm?.renspas ?? []
  function change(patch: Partial<BagInput>) {
    setDraft(current => {
      const next = { ...current, ...patch }
      return { ...next, last: lastEidFromQuantity(next.first, next.declaredQuantity) }
    })
    setReview(null); setError("")
  }
  const ranges = rangesFromQuantities(draft.first, allocations)
  const assigned = allocations.reduce((total, row) => total + (/^\d+$/.test(row.quantity) ? Number(row.quantity) : 0), 0)
  const remaining = /^\d+$/.test(draft.declaredQuantity) ? Number(draft.declaredQuantity) - assigned : null
  function changeAllocations(next: TagAllocation[]) { setAllocations(next); setReview(null); setError("") }
  function updateRange(index: number, patch: Partial<TagAllocation>) { changeAllocations(allocations.map((range, i) => i === index ? { ...range, ...patch } : range)) }
  function preview(event: FormEvent) {
    event.preventDefault(); setError("")
    try {
      if (!selectedClient || !selectedFarm || !renspas.some(row => row.id === draft.renspaId)) throw new Error("Seleccioná cliente, establecimiento y RENSPA.")
      if (mobile && step === 1) {
        if (!draft.last) throw new Error("Revisá la cantidad y el EID inicial de 15 dígitos.")
        setReview(null)
        setStep(2)
        return
      }
      if (allocations.some(row => !/^\d+$/.test(row.quantity) || Number(row.quantity) < 1 || Number(row.quantity) > MAX_BAG_QUANTITY)) throw new Error("Ingresá una cantidad entera válida para cada rango.")
      if (remaining !== null && remaining < 0) throw new Error("Las cantidades por destino superan la cantidad recibida.")
      setReview(validateTagBag(draft.first, draft.last, draft.declaredQuantity, ranges))
    } catch (cause) { setError(message(cause)) }
  }
  async function confirm() {
    if (busy.current || !review) return
    busy.current = true; setSaving(true); setError("")
    try { const id = await earTagsService.receive({ ...draft, ranges }); onSaved(id) }
    catch (cause) { setError(message(cause)) }
    finally { busy.current = false; setSaving(false) }
  }
  const showReview = Boolean(review && (!mobile || step === 2))
  return <section className="page ear-tags-page tag-entry-page" data-reviewing={showReview}>
    <header className="tag-entry-heading">
      <button type="button" className="text-button compact-back" aria-label="Volver a recepciones" disabled={saving} onClick={mobile ? onBackToLots : onClose}>
        <ArrowLeft size={20} aria-hidden="true"/>
      </button>
      <h1 ref={title} tabIndex={-1}>Ingresar caravanas</h1>
    </header>
    {mobile && <p className="tag-step-label">Paso {step} de 2 · {step === 1 ? "Campo y numeración" : "Destinos y revisión"}</p>}
    <form className="panel tag-bag-form" onSubmit={preview}>
      <fieldset disabled={saving} className="tag-form-fields">
        <fieldset className="tag-step-fields" hidden={mobile && step !== 1} disabled={mobile && step !== 1}>
        {scopedFarm && <p className="tag-receipt-context"><strong>{scopedFarm.name}</strong> · {selectedClient?.legalName}</p>}
        <div className={`form-grid tag-receipt-fields${scopedFarm ? " tag-receipt-scoped" : ""}`}>
          {!scopedFarm && <>
          {initialClientId ? <p className="tag-receipt-context"><strong>{selectedClient?.legalName}</strong></p> : <label>Cliente<AppSelect required value={clientId} onChange={event => { setClientId(event.target.value); setFarmId(""); change({ renspaId: "" }) }}><option value="">Seleccionar cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.legalName}</option>)}</AppSelect></label>}
          <label>Establecimiento<AppSelect required disabled={!clientId} value={farmId} onChange={event => { setFarmId(event.target.value); change({ renspaId: "" }) }}><option value="">Seleccionar establecimiento</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</AppSelect></label>
          </>}
          <label>RENSPA{scopedRenspa ? <input readOnly value={scopedRenspa.number}/> :
            <AppSelect required disabled={!farmId} value={draft.renspaId} onChange={event => change({ renspaId: event.target.value })}><option value="">Seleccionar RENSPA</option>{renspas.map(renspa => <option key={renspa.id} value={renspa.id}>{renspa.number}</option>)}</AppSelect>}</label>
          <label>Fecha de recepción<input required type="date" value={draft.receivedOn} onChange={event => change({ receivedOn: event.target.value })}/></label>
        </div>
        {(!clients.length || (selectedClient && !farms.length) || (selectedFarm && !renspas.length)) && <p className="tag-helper">Completá el cliente, establecimiento y RENSPA en <Link to={scopedFarm ? `/establecimientos/${scopedFarm.id}?tab=datos` : selectedClient ? `/clientes?cliente=${selectedClient.id}` : "/clientes"}>la ficha correspondiente</Link> antes de registrar la bolsa.</p>}
        <section className="form-section"><h2>Numeración recibida</h2><div className="form-grid tag-numbering-row">
          <label>Cantidad<input required type="number" min="1" max={MAX_BAG_QUANTITY} step="1" value={draft.declaredQuantity} onChange={event => change({ declaredQuantity: event.target.value })}/></label>
          <label>Desde EID<input required inputMode="numeric" value={draft.first} onChange={event => change({ first: event.target.value })}/></label>
          <label className="tag-last-eid-field">Hasta EID (automático)<input readOnly value={draft.last} placeholder="Se calcula con cantidad y desde EID"/></label>
          {draft.last && <output className="tag-last-eid-inline">Hasta EID <strong>{draft.last}</strong></output>}
        </div></section>
        </fieldset>
        <fieldset className="tag-step-fields" hidden={mobile && (step !== 2 || Boolean(review))} disabled={mobile && (step !== 2 || Boolean(review))}>
        {mobile && <p className="tag-receipt-context"><strong>{selectedFarm?.name}</strong> · {draft.declaredQuantity} caravanas</p>}
        <section className="form-section tag-destination-section"><div className="form-section-title"><h2><span className="tag-desktop-text">Destino por cantidades</span><span className="tag-mobile-text">Destinos</span></h2><button type="button" className="text-button" onClick={() => changeAllocations([...allocations, { quantity: "", sex: "" }])}><Plus size={16}/>Agregar destino</button></div>
          {allocations.map((range, index) => {
            const { first, last } = ranges[index]
            const quantity = /^\d+$/.test(range.quantity) ? Number(range.quantity) : 0
            const canUseRemaining = range.sex && remaining !== null && remaining > 0 && quantity + remaining <= MAX_BAG_QUANTITY
            return <fieldset className="tag-destination" key={index}>
              <legend>Destino {index + 1}</legend>
              <div className="tag-allocation-grid">
                <div className="tag-allocation-quantity">
                  <label>Cantidad<input required type="number" min="1" max={MAX_BAG_QUANTITY} step="1" value={range.quantity} onChange={event => updateRange(index, { quantity: event.target.value })}/></label>
                  {canUseRemaining && <button type="button" className="text-button" onClick={event => {
                    event.currentTarget.parentElement?.querySelector("input")?.focus()
                    updateRange(index, { quantity: String(quantity + remaining) })
                  }}>{quantity > 0 ? `Sumar las ${remaining} restantes` : assigned > 0 ? `Usar las ${remaining} restantes` : `Usar las ${remaining}`}</button>}
                </div>
                <label>Destino<AppSelect required value={range.sex} onChange={event => updateRange(index, { sex: event.target.value as TagAllocation["sex"] })}><option value="">Seleccionar</option><option value="macho">Machos</option><option value="hembra">Hembras</option></AppSelect></label>
                {first && last && <div className="tag-auto-range"><span className="tag-desktop-text">Desde / hasta (automático)</span><span className="tag-mobile-text">EID</span><strong className="tag-eid">{first} → {last}</strong></div>}
                {allocations.length > 1 && <button type="button" className="icon-button tag-remove-destination" aria-label={`Quitar destino ${index + 1}`} onClick={() => changeAllocations(allocations.filter((_, i) => i !== index))}><Trash2 size={17}/></button>}
              </div>
            </fieldset>
          })}
          {remaining !== null && <p className="tag-helper" role="status">{remaining < 0 ? `Excedés la cantidad recibida en ${-remaining} caravanas.` : remaining === 0 ? "Todas las caravanas están distribuidas." : `Quedan ${remaining} caravanas por distribuir.`}</p>}
        </section>
        </fieldset>
        <div className="dialog-actions tag-preview-actions">
          {mobile && step === 2
            ? <button type="button" className="secondary-button" onClick={() => { setError(""); setReview(null); setStep(1) }}>Atrás</button>
            : <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>}
          <button className="primary-button">{mobile && step === 1 ? "Continuar" : "Revisar recepción"}</button>
        </div>
      </fieldset>
      {error && <div ref={formError} className="form-error" role="alert">{error}</div>}
      {review && showReview && <section ref={reviewSummary} className="tag-review" aria-label="Resumen de recepción"><h2>Confirmar recepción</h2><p><strong>{selectedClient?.legalName} · {selectedFarm?.name}</strong><br/>RENSPA {renspas.find(row => row.id === draft.renspaId)?.number} · {draft.receivedOn.split("-").reverse().join("/")}</p><p>{review.quantity} caravanas: {sexCount(review.ranges, "macho")} para machos y {sexCount(review.ranges, "hembra")} para hembras.</p><div className="table-wrap"><table className="data-table"><thead><tr><th>Destino</th><th className="tag-desktop-text">Desde</th><th className="tag-desktop-text">Hasta</th><th className="tag-review-mobile-eid">Desde / hasta EID</th><th>Cantidad</th></tr></thead><tbody>{review.ranges.map(range => <tr key={range.first}><td>{range.sex === "macho" ? "Machos" : "Hembras"}</td><td className="tag-eid tag-desktop-text">{range.first}</td><td className="tag-eid tag-desktop-text">{range.last}</td><td className="tag-review-mobile-eid"><span className="tag-lot-eid">{range.first}</span><span className="tag-lot-eid">{range.last}</span></td><td>{range.quantity}</td></tr>)}</tbody></table></div><p>Al confirmar se registrarán como disponibles, sin crear animales.</p><div className="tag-review-actions">{mobile && <button type="button" className="secondary-button" disabled={saving} onClick={() => { setReview(null); setError(""); window.scrollTo(0, 0) }}>Editar destinos</button>}<button type="button" className="primary-button" disabled={saving} onClick={() => void confirm()}>{saving ? "Guardando…" : "Confirmar recepción"}</button></div></section>}
    </form>
  </section>
}
function sexCount(ranges: CheckedTagRange[], sex: CheckedTagRange["sex"]) { return ranges.filter(range => range.sex === sex).reduce((total, range) => total + range.quantity, 0) }
