import { Link } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import { rutaInicial } from '../routes/accesos.tsx'

export function NoAutorizadoPage() {
  const { sesion } = useAuth()
  return (
    <section>
      <h1>Sin acceso</h1>
      <p>Tu rol no tiene permiso para ver esta pantalla.</p>
      <Link to={rutaInicial(sesion?.rol ?? null)}>Volver al inicio</Link>
    </section>
  )
}