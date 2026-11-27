import { AppSelect } from "@/components/ui/AppSelect"
import { Beef, Sprout, TrendingUp } from "lucide-react"
import { livestockActivityLabels, type LivestockActivity, type LivestockProfile } from "./livestock-profile"

import "./livestock-profile.css"

const activities = Object.keys(livestockActivityLabels) as LivestockActivity[]
const icons = { cria: Beef, recria: TrendingUp, terminacion: Sprout }
const descriptions = {
  cria: "Produce terneros hasta el destete, la venta o el traslado.",
  recria: "Hace crecer la hacienda después del destete.",
  terminacion: "Engorda a pasto para la salida a faena.",
}

export function LivestockProfileFields({ value, onChange }: {
  value: LivestockProfile
  onChange: (value: LivestockProfile) => void
}) {
  function toggle(activity: LivestockActivity, checked: boolean) {
    const next = checked
      ? [...value.activities, activity]
      : value.activities.filter(item => item !== activity)
    onChange({ activities: next, primary: value.primary && next.includes(value.primary) ? value.primary : next[0] ?? null })
  }

  return <fieldset className="livestock-profile-fields">
    <legend>Actividad ganadera</legend>
    <p>Podés elegir más de una actividad.</p>
    <div className="livestock-profile-options">
      {activities.map(activity => {
        const Icon = icons[activity]
        return <label key={activity} className="livestock-profile-option">
          <span className="livestock-option-top">
            <span className="livestock-option-icon"><Icon size={19} aria-hidden="true"/></span>
            <input type="checkbox" checked={value.activities.includes(activity)}
              onChange={event => toggle(activity, event.target.checked)}/>
          </span>
          <strong>{livestockActivityLabels[activity]}</strong>
          <small>{descriptions[activity]}</small>
        </label>
      })}
    </div>
    {value.activities.length > 1 && <label className="livestock-profile-primary">Mostrar primero en Hacienda
      <AppSelect value={value.primary ?? ""} onChange={event => {
        const primary = value.activities.find(activity => activity === event.target.value)
        if (primary) onChange({ ...value, primary })
      }}>
        {value.activities.map(activity => <option key={activity} value={activity}>{livestockActivityLabels[activity]}</option>)}
      </AppSelect>
    </label>}
  </fieldset>
}

