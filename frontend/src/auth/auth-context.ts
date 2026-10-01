import { createContext, useContext } from 'react'
import type { RolNombre } from '../api.ts'

/** Datos de la sesión. El rol viene limpio del login ("Administrador" | "Cajero" | "Pizzero"). */
export interface Sesion {
  id: number
  nombre: string
  rol: RolNombre | null
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  sesion: Sesion | null
  login: (correo: string, contra: string) => Promise<Sesion>
  logout: () => void
  /** true si el usuario logueado tiene alguno de los roles indicados. */
  hasRole: (...roles: RolNombre[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return value
}