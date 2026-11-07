import { House, ShieldX } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import ui from '../features/admin/Ui.module.css'
import { rutaInicial } from '../routes/accesos.tsx'
import { PaginaMensaje } from './PaginaMensaje.tsx'

export function NoAutorizadoPage() {
  const { sesion } = useAuth()
  return (
    <PaginaMensaje
      icono={ShieldX}
      titulo="Sin acceso"
      acciones={
        <Link className={`${ui.btn} ${ui.primario}`} to={rutaInicial(sesion?.rol ?? null)}>
          <House size={16} aria-hidden="true" /> Volver al inicio
        </Link>
      }
    >
      {sesion?.rol ? (
        <p>Tu rol no tiene permiso para ver esta pantalla.</p>
      ) : (
        <p>
          Tu usuario no tiene un rol que el sistema reconozca (Administrador, Cajero o Pizzero). Pide a un
          administrador que lo corrija.
        </p>
      )}
    </PaginaMensaje>
  )
}
