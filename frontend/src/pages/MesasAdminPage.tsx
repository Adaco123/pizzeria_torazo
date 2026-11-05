import { MarcoAdmin } from '../features/admin/MarcoAdmin.tsx'
import { MesasAdmin } from '../features/mesas/MesasAdmin.tsx'

export function MesasAdminPage() {
  return (
    <MarcoAdmin
      seccion="/admin/mesas"
      descripcion="Las mesas del local. Una mesa que ya tuvo cuentas no se borra: se desactiva y deja de aparecer en el plano."
    >
      <MesasAdmin />
    </MarcoAdmin>
  )
}
