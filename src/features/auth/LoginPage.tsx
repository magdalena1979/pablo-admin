import { FormEvent, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { LockKeyhole, Mail } from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"

export function LoginPage() {
  const { session, profile, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const destination = (location.state as { from?: string } | null)?.from || "/"
  if (session && profile) return <Navigate to={destination} replace />
  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null)
    try { await signIn(email, password) } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos iniciar sesión.") } finally { setSubmitting(false) }
  }
  return <main className="login-page"><section className="login-brand"><div className="login-monogram">PM</div><span>GESTIÓN AGROPECUARIA</span><h1>Información clara para decidir mejor.</h1><p>Producción, sanidad y administración de todos los campos de Pablo Mendivil.</p></section><section className="login-form-wrap"><form className="login-card" onSubmit={submit}><span className="eyebrow">ACCESO PRIVADO</span><h2>Ingresar al sistema</h2><p>Usá las credenciales asignadas por Pablo.</p><label>Correo electrónico<div className="field-control"><Mail size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" /></div></label><label>Contraseña<div className="field-control"><LockKeyhole size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" /></div></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="primary-button login-submit" disabled={submitting}>{submitting ? "Ingresando…" : "Ingresar"}</button></form></section></main>
}
