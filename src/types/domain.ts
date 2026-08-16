export type AppRole = "super_admin" | "administrativo" | "empleado_campo"
export type ServiceMode = "veterinaria" | "administracion_integral"

export interface FarmSummary {
  id: string
  name: string
  clientName: string
  serviceMode: ServiceMode
  totalHectares: number
  lotCount: number
  cattleCount: number
}
