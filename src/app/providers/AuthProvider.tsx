import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"
import type { AppRole } from "@/types/domain"

export interface AuthProfile {
  id: string
  fullName: string
  email: string
  role: AppRole
}

interface AuthContextValue {
  session: Session | null
  profile: AuthProfile | null
  loading: boolean
  configured: boolean
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return null
    const { data, error } = await supabase.from("profiles").select("id,full_name,email,role,active").eq("id", userId).single()
    if (error) throw error
    if (!data.active) throw new Error("Tu usuario está desactivado.")
    return { id: data.id, fullName: data.full_name, email: data.email, role: data.role as AppRole }
  }, [])

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next)
    setProfile(next ? await loadProfile(next.user.id) : null)
  }, [loadProfile])

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    void supabase.auth.getSession().then(async ({ data }) => {
      try { if (mounted) await applySession(data.session) } finally { if (mounted) setLoading(false) }
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      window.setTimeout(() => { if (mounted) void applySession(next) }, 0)
    })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [applySession])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase todavía no está configurado.")
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) throw new Error("Correo o contraseña incorrectos.")
    await applySession(data.session)
  }, [applySession])

  const signOut = useCallback(async () => { await supabase?.auth.signOut(); setSession(null); setProfile(null) }, [])
  const value = useMemo(() => ({ session, profile, loading, configured: isSupabaseConfigured, signIn, signOut }), [session, profile, loading, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return context
}
