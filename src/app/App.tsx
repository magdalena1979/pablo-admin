import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { ActionHomePage } from "@/features/dashboard/ActionHomePage"
import { ClientsPage } from "@/features/configuration/ClientsPage"
import { EarTagsPage } from "@/features/ear-tags/EarTagsPage"
import { LivestockRegistryPage } from "@/features/livestock/LivestockRegistryPage"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/app/router/ProtectedRoute"

import { FarmDetailPage } from "@/features/farms/FarmDetailPage"
import { EstablishmentPage } from "@/features/farms/EstablishmentPage"
import { GallagherFilesPage } from "@/features/livestock/GallagherFilesPage"
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
          <Route index element={<Navigate to="/inicio" replace />} /><Route path="inicio" element={<ActionHomePage />} /><Route path="clientes" element={<ClientsPage />} />
          <Route path="caravanas" element={<EarTagsPage />} />
          <Route path="establecimientos/:id" element={<EstablishmentPage />} />
          <Route path="campos" element={<Navigate to="/configuracion" replace />} />
          <Route path="campos/:id" element={<FarmDetailPage />} />
          <Route path="hacienda/:sharedCsvId?" element={<GallagherFilesPage />} />
          <Route path="sanidad" element={<HealthPage />} />
          <Route path="labores" element={<OperationsPage />} />
          <Route path="configuracion" element={<ConfigurationPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
