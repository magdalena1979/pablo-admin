import { AppSelect } from "@/components/ui/AppSelect"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowLeft } from "lucide-react"
import { clientsService, type ClientRecord } from "@/services/clients.service"
import { earTagsService } from "@/services/ear-tags.service"
import type { CsvFileReview } from "@/services/gallagher-csv-preview.service"
import { MAX_BAG_QUANTITY, type TagSex } from "@/features/ear-tags/ear-tag-ranges"
import type { CsvDestination } from "./csv-confirmation"
import "./csv-import-dialog.css"

export function missingGallagherTags(file: CsvFileReview) {
  return Array.from(new Map(file.rows
    .filter(row => row.result === "sin_alta" && /^\d{15}$/.test(row.eid))
    .map(row => [row.eid, row])).values())
}

export function GallagherTagRegistrationDialog({ file, destination, onBack, onRegistered }: {
  file: CsvFileReview
  destination?: CsvDestination
  onBack(): void
  onRegistered(): void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const savingNow = useRef(false)
  const [groupId] = useState(() => crypto.randomUUID())
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [attempt, setAttempt] = useState(0)
  const [farmId, setFarmId] = useState(destination?.farmId ?? "")
  const [selectedRenspaId, setRenspaId] = useState("")
  const [sex, setSex] = useState<TagSex | "">("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(new Set<string>())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const missing = missingGallagherTags(file)
  const farms = clients.flatMap(client => client.farms.map(farm => ({ ...farm, client: client.legalName })))
  const farm = farms.find(item => item.id === farmId)
  const fixedRenspa = farm?.renspas.find(item => item.id === destination?.renspaId)
    ?? (destination?.farmId && farm?.renspas.length === 1 ? farm.renspas[0] : undefined)
  const renspaId = fixedRenspa?.id ?? selectedRenspaId
  const text = query.trim().toLowerCase()
  const visible = missing.filter(row => row.eid.includes(text.replace(/\s/g, "")) || row.tag.toLowerCase().includes(text))
  const selectedAllVisible = visible.length > 0 && visible.every(row => selected.has(row.eid))

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError("")
    void clientsService.list(destination?.farmId).then(rows => {
      if (!active) return
      setClients(destination?.clientId ? rows.filter(row => row.id === destination.clientId) : rows)
    }).catch(() => {
      if (active) setLoadError("No pudimos cargar los establecimientos.")
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [attempt, destination?.clientId, destination?.farmId])

  function selectEids(eids: string[], checked: boolean) {
    setSelected(previous => {
      const next = new Set(previous)
      for (const eid of eids) {
        if (checked) next.add(eid)
        else next.delete(eid)
      }
      return next
    })
    setError("")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingNow.current || !sex || !farm?.renspas.some(item => item.id === renspaId) || !selected.size || selected.size > MAX_BAG_QUANTITY) return
    const conflict = file.rows.find(row => selected.has(row.eid) && row.sex && row.sex !== sex)
    if (conflict) {
      setError(`El destino elegido contradice el sexo del CSV para el EID ${conflict.eid}.`)
      return
    }
    savingNow.current = true
    setSaving(true)
    setError("")
    try {
      await earTagsService.registerGallagher({
        groupId, renspaId, sex, eids: [...selected], fileHash: file.hash, filename: file.file.name,
      })
      onRegistered()
    } catch (cause) {
      setError(cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "No pudimos registrar el grupo.")
    } finally {
      savingNow.current = false
      setSaving(false)
    }
  }

  return <dialog ref={dialog} className="dialog-card gallagher-tag-dialog" aria-labelledby="gallagher-tag-title"
    onCancel={event => { event.preventDefault(); if (!savingNow.current) onBack() }}>
    <form onSubmit={event => void submit(event)}>
      <header className="gallagher-tag-heading">
        <button type="button" className="text-button compact-back" aria-label="Volver a la revisión"
          disabled={saving} onClick={onBack}><ArrowLeft size={20} aria-hidden="true"/></button>
        <h2 id="gallagher-tag-title">Dar de alta caravanas</h2>
      </header>
      <p className="gallagher-tag-filename">{file.file.name}</p>
      {loadError && <div className="form-error" role="alert">{loadError} <button type="button" className="text-button" onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div>}
      <fieldset className="registration-inputs" disabled={saving || loading || Boolean(loadError)}>
        <div className="form-grid gallagher-tag-destination">
          {destination?.farmId ? <label>Establecimiento<input readOnly value={farm?.name ?? ""}/></label> : <label>Establecimiento<AppSelect required value={farmId} onChange={event => { setFarmId(event.target.value); setRenspaId("") }}>
            <option value="">Seleccionar</option>
            {farms.map(item => <option key={item.id} value={item.id}>{item.name} · {item.client}</option>)}
          </AppSelect></label>}
          <label>RENSPA{fixedRenspa ? <input readOnly value={fixedRenspa.number}/> : <AppSelect required value={renspaId} disabled={!farm?.renspas.length} onChange={event => setRenspaId(event.target.value)}>
            <option value="">Seleccionar</option>
            {farm?.renspas.map(item => <option key={item.id} value={item.id}>{item.number}</option>)}
          </AppSelect>}</label>
          <label>Destino<AppSelect required value={sex} onChange={event => setSex(event.target.value as TagSex | "")}>
            <option value="">Seleccionar</option><option value="macho">Machos</option><option value="hembra">Hembras</option>
          </AppSelect></label>
        </div>
        <label className="search gallagher-tag-search"><input aria-label="Buscar caravanas sin alta" type="search"
          placeholder="Buscar EID o caravana visual" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <div className="gallagher-tag-selection">
          <span role="status">{selected.size} de {missing.length} seleccionadas</span>
          <button type="button" className="text-button" disabled={!visible.length}
            onClick={() => selectEids(visible.map(row => row.eid), !selectedAllVisible)}>
            {selectedAllVisible ? "Quitar selección visible" : text ? "Seleccionar visibles" : "Seleccionar todas"}
          </button>
        </div>
        <ul className="gallagher-tag-list" aria-label="Caravanas sin alta">
          {visible.map(row => <li key={row.eid}><label>
            <input type="checkbox" checked={selected.has(row.eid)} onChange={event => selectEids([row.eid], event.target.checked)}/>
            <span className="gallagher-tag-eid">{row.eid}</span>
            {row.tag && <small>Visual {row.tag}</small>}
          </label></li>)}
          {!visible.length && <li>No hay EID para esta búsqueda.</li>}
        </ul>
      </fieldset>
      {selected.size > MAX_BAG_QUANTITY && <p role="alert">Seleccioná hasta {MAX_BAG_QUANTITY} EID por grupo.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="secondary-button" onClick={onBack} disabled={saving}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={saving || loading || Boolean(loadError) || !renspaId || !sex || !selected.size || selected.size > MAX_BAG_QUANTITY}>
          {saving ? "Registrando…" : "Registrar grupo y revisar"}
        </button>
      </div>
    </form>
  </dialog>
}
