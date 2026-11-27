export const livestockActivityLabels = {
  cria: "Cría",
  recria: "Recría",
  terminacion: "Terminación a pasto",
} as const

export type LivestockActivity = keyof typeof livestockActivityLabels
export interface LivestockProfile {
  activities: LivestockActivity[]
  primary: LivestockActivity | null
}

export const emptyLivestockProfile: LivestockProfile = { activities: [], primary: null }
