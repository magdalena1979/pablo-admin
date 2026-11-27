export interface Weighing { animalId: string; date: string; kg: number }

export function summarizeWeighings(ids: ReadonlySet<string>, weighings: Weighing[]) {
  const byDay = new Map<string, Map<string, number>>()
  for (const { animalId, date, kg } of weighings) {
    if (!ids.has(animalId)) continue
    const weights = byDay.get(date) ?? new Map<string, number>()
    if (!weights.has(animalId)) weights.set(animalId, kg)
    byDay.set(date, weights)
  }
  const [latest, previous] = [...byDay].sort(([a], [b]) => b.localeCompare(a))
  if (!latest) return null
  const [date, weights] = latest
  const average = [...weights.values()].reduce((sum, kg) => sum + kg, 0) / weights.size
  let paired = 0
  let gain = 0
  if (previous) {
    const [previousDate, previousWeights] = previous
    const days = (Date.parse(date) - Date.parse(previousDate)) / 86_400_000
    for (const [animalId, kg] of weights) {
      const initial = previousWeights.get(animalId)
      if (initial === undefined) continue
      paired++
      gain += (kg - initial) / days
    }
  }
  return { date, previousDate: previous?.[0] ?? null, average, weighed: weights.size, paired, gain: paired ? gain / paired : null }
}
