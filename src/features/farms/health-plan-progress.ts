import type { HealthPlanCompletion } from "./health-plan.service"

export function healthPlanProgress(completions: HealthPlanCompletion[], year: number) {
  const bySlot = new Map<string, HealthPlanCompletion[]>()
  for (const completion of completions) {
    const date = /^(\d{4})-(0[1-9]|1[0-2])-\d{2}/.exec(completion.date)
    if (!date || Number(date[1]) !== year) continue
    const key = `${completion.itemId}:${Number(date[2])}`
    const slot = bySlot.get(key) ?? []
    slot.push(completion)
    bySlot.set(key, slot)
  }
  return bySlot
}
