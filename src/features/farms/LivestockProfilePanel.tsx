import { useState } from "react"
import { clientsService } from "@/services/clients.service"
import { LivestockProfileFields } from "./LivestockProfileFields"
import { livestockActivityLabels, type LivestockProfile } from "./livestock-profile"

export function LivestockProfilePanel({ farmId, profile, canEdit, onSaved }: {
  farmId: string
  profile: LivestockProfile
  canEdit: boolean
  onSaved: (profile: LivestockProfile) => void
}) {
  const [draft, setDraft] = useState<LivestockProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  return <section className="panel livestock-profile-panel" aria-label="Actividad ganadera">
    {draft ? <form onSubmit={async event => {
      event.preventDefault()
      setSaving(true)
      setError(false)
      try {
        await clientsService.updateLivestockProfile(farmId, draft)
        onSaved(draft)
        setDraft(null)
      } catch {
        setError(true)
      } finally {
        setSaving(false)
      }
    }}>
      <fieldset className="livestock-profile-edit" disabled={saving}>
        <LivestockProfileFields value={draft} onChange={setDraft}/>
        {error && <p className="form-error" role="alert">No se pudo guardar la actividad ganadera. Volvé a intentar.</p>}
        <div className="livestock-profile-actions">
          <button type="button" className="secondary-button" onClick={() => setDraft(null)}>Cancelar</button>
          <button className="primary-button">{saving ? "Guardando…" : "Guardar actividad"}</button>
        </div>
      </fieldset>
    </form> : <div className="livestock-profile-summary">
      <div>
        <h2>Actividad ganadera</h2>
        {profile.activities.length ? <ul className="livestock-profile-tags">{profile.activities.map(activity =>
          <li key={activity}>{livestockActivityLabels[activity]}
            {profile.activities.length > 1 && activity === profile.primary && <small>Principal</small>}
          </li>
        )}</ul> : <p>Sin configurar</p>}
      </div>
      {canEdit && <button type="button" className="secondary-button" onClick={() => {
        setDraft(profile)
        setError(false)
      }}>{profile.activities.length ? "Editar actividad" : "Configurar actividad"}</button>}
    </div>}
  </section>
}
