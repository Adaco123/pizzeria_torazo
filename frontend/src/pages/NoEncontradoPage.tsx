import { Link } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import { rutaInicial } from '../routes/accesos.tsx'

export function NoEncontradoPage() {
  const { sesion } = useAuth()
  return (
    <section>
      <h1>Página no encontrada</h1>
      <Link to={rutaInicial(sesion?.rol ?? null)}>Volver al inicio</Link>
    </section>
  )
}