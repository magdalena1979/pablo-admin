import { useEffect, useState } from "react"
import { CalendarClock, Download, Landmark } from "lucide-react"
import { useFarmScope } from "@/app/providers/FarmScopeProvider"
import { positionService, type Commitment } from "@/services/position.service"
import { livestockEconomicsService, type LivestockCycle } from "@/services/livestock-economics.service"

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })
const num = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 })
const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" })

export function DashboardPage() {
  const { selectedFarm, selectedFarmId } = useFarmScope()
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [livestock, setLivestock] = useState<LivestockCycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true)
    Promise.all([positionService.load(selectedFarmId), livestockEconomicsService.list(selectedFarmId)])
      .then(([position, cycles]) => { setCommitments(position.commitments); setLivestock(cycles) })
      .catch(cause => setError(cause instanceof Error ? cause.message : "No pudimos construir la posición."))
      .finally(() => setLoading(false))
  }, [selectedFarmId])
  if (loading) return <section className="page"><div className="loading-panel">Construyendo la posición actual…</div></section>
  if (error) return <section className="page"><div className="data-error"><strong>No pudimos construir la posición</strong><span>{error}</span></div></section>
  const heads = livestock.reduce((total, cycle) => total + cycle.closingHeads, 0)
  const liveWeight = livestock.reduce((total, cycle) => total + cycle.closingWeight, 0)
  const toCollect = commitments.filter(item => item.direction === "cobrar").reduce((total, item) => total + item.amount, 0)
  const toPay = commitments.filter(item => item.direction === "pagar").reduce((total, item) => total + item.amount, 0)
  return <section className="page">
    <div className="page-heading"><div><span className="eyebrow">POSICIÓN ACTUAL</span><h1>{selectedFarm ? `Dónde está parado ${selectedFarm.name}` : "Dónde está parado Pablo hoy"}</h1><p>Hacienda y compromisos registrados.</p></div><button className="secondary-button dashboard-export" onClick={() => window.print()}><Download size={16}/>Exportar informe PDF</button></div>
    <div className="metrics"><Metric label="Hacienda actual" value={`${heads} cab.`} detail={`${num.format(liveWeight)} kg vivos`} Icon={Landmark}/><Metric label="Posición próximos pagos" value={money.format(toCollect - toPay)} detail={`${money.format(toCollect)} a cobrar · ${money.format(toPay)} a pagar`} Icon={CalendarClock}/></div>
    <section className="table-section"><div className="table-section-heading"><div><span className="eyebrow">PRÓXIMOS 30 DÍAS</span><h2>Pagos y cobranzas previstos</h2></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Vence</th><th>Campo</th><th>Concepto</th><th>Tipo</th><th>Importe</th></tr></thead><tbody>{commitments.length ? commitments.map(item => <tr key={item.id}><td>{dateFmt.format(new Date(`${item.date}T12:00:00`))}</td><td>{item.farmName}</td><td><strong>{item.concept}</strong><small className="cell-note">{item.counterparty}</small></td><td><span className={`decision-signal ${item.direction === "cobrar" ? "good" : "watch"}`}>{item.direction}</span></td><td className="money-cell">{money.format(item.amount)}</td></tr>) : <tr><td colSpan={5}><div className="table-empty-state">No hay pagos ni cobranzas previstos para los próximos 30 días.</div></td></tr>}</tbody></table></div></section>
  </section>
}

function Metric({ label, value, detail, Icon }: { label: string; value: string; detail: string; Icon: typeof Landmark }) {
  return <article className="metric-card"><div className="metric-icon"><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}
