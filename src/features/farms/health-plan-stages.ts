export const healthPlanStages = {
  paricion: "Parición",
  servicio: "Servicio",
  general: "General",
} as const

export type HealthPlanStage = keyof typeof healthPlanStages

// Marcas explícitas de las hojas del Excel, alineadas con sus encabezados de mes.
const stagesByGroup: Record<string, Partial<Record<Exclude<HealthPlanStage, "general">, number[]>>> = {
  Vacas: { paricion: [7, 8, 9], servicio: [10, 11, 12, 1] },
  "Terneros al pie": { paricion: [8] },
  Toros: { servicio: [11] },
  "Vaquillonas de primer servicio de otoño": { servicio: [6, 7] },
  "Vacas paridas de otoño": { paricion: [3, 4], servicio: [10, 11, 12] },
  "Terneros de otoño al pie": { paricion: [3] },
}

export function healthPlanStageFor(group: string, month: number): HealthPlanStage {
  const stages = stagesByGroup[group]
  if (stages?.paricion?.includes(month)) return "paricion"
  if (stages?.servicio?.includes(month)) return "servicio"
  return "general"
}
