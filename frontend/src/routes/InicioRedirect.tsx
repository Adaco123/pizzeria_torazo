import { Navigate } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import { rutaInicial } from './accesos.tsx'

/** La ruta "/" lleva a cada rol a su pantalla inicial. */
export function InicioRedirect() {
  const { sesion } = useAuth()
  return <Navigate to={rutaInicial(sesion?.rol ?? null)} replace />
}