import { Link } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import { rutaInicial } from '../routes/accesos.tsx'

export function NoAutorizadoPage() {
  const { sesion } = useAuth()
  return (
    <section>
      <h1>Sin acceso</h1>
      {sesion?.rol ? (
        <p>Tu rol no tiene permiso para ver esta pantalla.</p>
      ) : (
        <p>
          Tu usuario no tiene un rol que el sistema reconozca (Administrador, Cajero o Pizzero). Pide
          a un administrador que lo corrija.
        </p>
      )}
      <Link to={rutaInicial(sesion?.rol ?? null)}>Volver al inicio</Link>
    </section>
  )
}