import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import type { RolNombre } from '../api.ts'
import { useAuth } from '../auth/auth-context.ts'

/**
 * - Sin sesión: manda a /login y recuerda a dónde quería ir.
 * - Con sesión pero sin el rol pedido: manda a /no-autorizado.
 * - Si no recibe `children`, renderiza las rutas hijas (`<Outlet />`).
 */
export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: RolNombre[]
  children?: ReactNode
}) {
  const { status, hasRole } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <p style={{ padding: 24 }}>Cargando…</p>
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />
  if (roles && !hasRole(...roles)) return <Navigate to="/no-autorizado" replace />

  return children ?? <Outlet />
}