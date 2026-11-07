import { House, SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import ui from '../features/admin/Ui.module.css'
import { rutaInicial } from '../routes/accesos.tsx'
import { PaginaMensaje } from './PaginaMensaje.tsx'

export function NoEncontradoPage() {
  const { sesion } = useAuth()
  return (
    <PaginaMensaje
      icono={SearchX}
      titulo="Página no encontrada"
      acciones={
        <Link className={`${ui.btn} ${ui.primario}`} to={rutaInicial(sesion?.rol ?? null)}>
          <House size={16} aria-hidden="true" /> Volver al inicio
        </Link>
      }
    >
      <p>La dirección no existe o fue movida.</p>
    </PaginaMensaje>
  )
}
