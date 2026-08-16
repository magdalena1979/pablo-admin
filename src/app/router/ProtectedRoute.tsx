import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/app/providers/AuthProvider"

export function ProtectedRoute() {
  const { session, profile, loading, configured } = useAuth()
  const location = useLocation()
  if (!configured) return <Outlet />
  if (loading) return <main className="session-state">Cargando sesión…</main>
  if (!session || !profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
