import type { ReactNode } from 'react'
import type { RolNombre } from '../api.ts'
import { useAuth } from './auth-context.ts'

/**
 * Muestra `children` solo si el usuario tiene alguno de los roles indicados.
 * Es una ayuda de interfaz: la seguridad real la tiene que dar el backend.
 */
export function RequireRole({
  roles,
  children,
  fallback = null,
}: {
  roles: RolNombre[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const { hasRole } = useAuth()
  return hasRole(...roles) ? children : fallback
}