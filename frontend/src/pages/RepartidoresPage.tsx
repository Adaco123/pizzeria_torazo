import { MarcoAdmin } from '../features/admin/MarcoAdmin.tsx'
import { RepartidoresAdmin } from '../features/repartidores/RepartidoresAdmin.tsx'

export function RepartidoresPage() {
  return (
    <MarcoAdmin
      seccion="/admin/repartidores"
      descripcion="Personas o empresas de delivery. El cajero elige una al cobrar un domicilio. Si alguien ya hizo entregas no se borra: se desactiva y deja de aparecer en caja."
    >
      <RepartidoresAdmin />
    </MarcoAdmin>
  )
}
