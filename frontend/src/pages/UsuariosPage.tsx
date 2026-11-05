import { MarcoAdmin } from '../features/admin/MarcoAdmin.tsx'
import { UsuariosAdmin } from '../features/usuarios/UsuariosAdmin.tsx'

export function UsuariosPage() {
  return (
    <MarcoAdmin
      seccion="/admin/usuarios"
      descripcion="Solo el administrador crea, edita y desactiva usuarios. Cada persona cambia su propia contraseña en «Mi cuenta»."
    >
      <UsuariosAdmin />
    </MarcoAdmin>
  )
}
