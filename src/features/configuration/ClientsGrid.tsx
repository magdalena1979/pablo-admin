import type { ClientRecord, ClientFarm, ClientRenspa } from "@/services/clients.service"

type GridRow = { farm: ClientFarm | null; renspa: ClientRenspa | null }

export function ClientsGrid({ clients, onOpen }: { clients: ClientRecord[]; onOpen(id: string): void }) {
  return <div className="clients-grid-frame">
    <div className="clients-grid-summary"><strong>{clients.length} clientes</strong><span>Deslizá hacia la derecha para ver todas las columnas.</span></div>
    <div className="clients-grid-scroll" tabIndex={0} role="region" aria-label="Tabla de clientes, establecimientos y RENSPA">
      <table className="clients-grid">
        <caption>Clientes, datos de contacto, establecimientos y RENSPA</caption>
        <thead><tr><th scope="col">N.º</th><th scope="col">Razón social</th><th scope="col">CUIT</th><th scope="col">Domicilio del cliente</th><th scope="col">Responsable</th><th scope="col">Teléfono</th><th scope="col">Mail</th><th scope="col">Establecimiento</th><th scope="col">Ubicación del establecimiento</th><th scope="col">RENSPA</th><th scope="col">CUIG</th><th scope="col">CV</th><th scope="col">Acción</th></tr></thead>
        <tbody>{clients.flatMap((client, clientIndex) => {
          // Keep each RENSPA beside its actual establishment, including incomplete clients.
          const rows: GridRow[] = client.farms.length ? client.farms.flatMap<GridRow>(farm => farm.renspas.length
            ? farm.renspas.map(renspa => ({ farm, renspa }))
            : [{ farm, renspa: null }]) : [{ farm: null, renspa: null }]
          return rows.map(({ farm, renspa }, rowIndex) => <tr key={`${client.id}:${farm?.id ?? "none"}:${renspa?.id ?? "none"}`} className={clientIndex % 2 ? "client-grid-alternate" : ""}>
            {rowIndex === 0 && <>
              <td rowSpan={rows.length} className="client-grid-index">{clientIndex + 1}</td>
              <th scope="row" rowSpan={rows.length} className="client-grid-name"><button type="button" onClick={() => onOpen(client.id)}>{client.legalName || "Sin completar"}</button></th>
              <td rowSpan={rows.length} className="client-grid-identifier">{client.taxId || "—"}</td>
              <td rowSpan={rows.length}>{client.address || "—"}</td>
              <td rowSpan={rows.length}>{client.responsible || "—"}</td>
              <td rowSpan={rows.length} className="client-grid-identifier">{client.phone || "—"}</td>
              <td rowSpan={rows.length}>{client.email || "—"}</td>
            </>}
            <td>{farm?.name || "Sin establecimiento"}</td>
            <td>{farm ? [farm.address, farm.locality, farm.province].filter(Boolean).join(" · ") || "—" : "—"}</td>
            <td className="client-grid-identifier">{renspa?.number || "Sin RENSPA"}</td>
            <td>{renspa?.cuig || "—"}</td><td>{renspa?.cv || "—"}</td>
            {rowIndex === 0 && <td rowSpan={rows.length}><button type="button" className="table-action" onClick={() => onOpen(client.id)}>Ver ficha →</button></td>}
          </tr>)
        })}</tbody>
      </table>
    </div>
  </div>
}
