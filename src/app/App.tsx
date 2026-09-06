import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/app/router/ProtectedRoute"
import { LivestockRegistryPage } from "@/features/livestock/LivestockRegistryPage"
import { FarmDetailPage } from "@/features/farms/FarmDetailPage"
import { FarmScopeProvider } from "@/app/providers/FarmScopeProvider"
import { HealthPage } from "@/features/health/HealthPage"
import { ConfigurationPage } from "@/features/configuration/ConfigurationPage"
import { OperationsPage } from "@/features/operations/OperationsPage"
import "@/features/dashboard/position.css"
import "@/features/dashboard/history.css"
import "@/features/configuration/configuration.css"

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<FarmScopeProvider><AppShell /></FarmScopeProvider>}>
          <Route index element={<DashboardPage />} />
          <Route path="campos" element={<Navigate to="/configuracion" replace />} />
          <Route path="campos/:id" element={<FarmDetailPage />} />
          <Route path="hacienda" element={<LivestockRegistryPage />} />
          <Route path="sanidad" element={<HealthPage />} />
          <Route path="labores" element={<OperationsPage />} />
          <Route path="configuracion" element={<ConfigurationPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
