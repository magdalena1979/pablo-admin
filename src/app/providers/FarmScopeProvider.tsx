import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { agroService, type FarmListItem } from "@/services/agro.service"

interface FarmScopeValue {
  farms: FarmListItem[]
  selectedFarmId: string | null
  selectedFarm: FarmListItem | null
  loading: boolean
  selectFarm(id: string | null): void
  refresh(): Promise<void>
}

const FarmScopeContext = createContext<FarmScopeValue | null>(null)
const storageKey = "pm-selected-farm"

export function FarmScopeProvider({ children }: { children: React.ReactNode }) {
  const [farms, setFarms] = useState<FarmListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(() => localStorage.getItem(storageKey))
  const refresh = async () => {
    const next = await agroService.listFarms()
    setFarms(next)
    if (selectedFarmId && !next.some(farm => farm.id === selectedFarmId)) setSelectedFarmId(null)
    setLoading(false)
  }
  useEffect(() => { void refresh() }, [])
  const selectFarm = (id: string | null) => { setSelectedFarmId(id); if (id) localStorage.setItem(storageKey, id); else localStorage.removeItem(storageKey) }
  const value = useMemo(() => ({ farms, selectedFarmId, selectedFarm: farms.find(farm => farm.id === selectedFarmId) ?? null, loading, selectFarm, refresh }), [farms, selectedFarmId, loading])
  return <FarmScopeContext.Provider value={value}>{children}</FarmScopeContext.Provider>
}

export function useFarmScope() {
  const context = useContext(FarmScopeContext)
  if (!context) throw new Error("useFarmScope debe usarse dentro de FarmScopeProvider")
  return context
}
