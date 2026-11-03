import { useAuth } from '../../auth/auth-context.ts'
import { BarraCajaMesas } from './BarraCajaMesas.tsx'
import { BarraMesero } from './BarraMesero.tsx'

/** Cada rol ve solo lo que el backend le permite hacer. */
export function HerramientasMesas() {
  const { hasRole } = useAuth()
  if (hasRole('Cajero', 'Administrador')) return <BarraCajaMesas />
  if (hasRole('Mesero')) return <BarraMesero />
  return null
}
