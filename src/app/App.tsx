import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { PlaceholderPage } from "@/features/shared/PlaceholderPage"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/app/router/ProtectedRoute"
import { LivestockPage } from "@/features/livestock/LivestockPage"
import { FarmDetailPage } from "@/features/farms/FarmDetailPage"
import { FarmScopeProvider } from "@/app/providers/FarmScopeProvider"
import { HealthPage } from "@/features/health/HealthPage"
import { AdministrationPage } from "@/features/administration/AdministrationPage"
import { ConfigurationPage } from "@/features/configuration/ConfigurationPage"
import { IncomePage } from "@/features/income/IncomePage"
import { OperationsPage } from "@/features/operations/OperationsPage"
import { AgriculturePage } from "@/features/agriculture/AgriculturePage"
import "@/features/dashboard/position.css"
import { ManagementPage } from "@/features/management/ManagementPage"
import "@/features/management/control.css"
import { InventoryPage } from "@/features/inventory/InventoryPage"
import "@/features/inventory/inventory.css"
import { SuppliesPage } from "@/features/supplies/SuppliesPage"
import "@/features/supplies/supplies.css"
import { CampaignHistoryPage } from "@/features/campaigns/CampaignHistoryPage"
import "@/features/campaigns/campaigns.css"
import { DashboardCampaignSummary } from "@/features/dashboard/DashboardCampaignSummary"
import "@/features/dashboard/history.css"
import { LivestockDecisionPage } from "@/features/livestock/LivestockDecisionPage"
import "@/features/livestock/decision.css"
import "@/features/configuration/configuration.css"

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<FarmScopeProvider><AppShell /></FarmScopeProvider>}>
          <Route index element={<><DashboardPage/><DashboardCampaignSummary/></>} />
          <Route path="campos" element={<Navigate to="/configuracion" replace />} />
          <Route path="campos/:id" element={<FarmDetailPage />} />
          <Route path="hacienda" element={<LivestockPage />} />
          <Route path="decision-destete" element={<LivestockDecisionPage />} />
          <Route path="sanidad" element={<HealthPage />} />
          <Route path="administracion" element={<AdministrationPage />} />
          <Route path="ingresos" element={<IncomePage />} />
          <Route path="labores" element={<OperationsPage />} />
          <Route path="agricultura" element={<AgriculturePage />} />
          <Route path="control" element={<ManagementPage />} />
          <Route path="campanias" element={<CampaignHistoryPage />} />
          <Route path="existencias" element={<InventoryPage />} />
          <Route path="insumos" element={<SuppliesPage />} />
          <Route path="tareas" element={<PlaceholderPage title="Tareas y alertas" description="Trabajo pendiente por campo y responsable." />} />
          <Route path="configuracion" element={<ConfigurationPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
