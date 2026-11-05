import { MarcoAdmin } from '../features/admin/MarcoAdmin.tsx'
import { ReporteVentas } from '../features/reportes/ReporteVentas.tsx'

export function ReportesPage() {
  return (
    <MarcoAdmin
      titulo="Reportes de ventas"
      seccion="/admin/reportes"
      descripcion="Cuenta los pedidos cobrados y no cancelados, por el día en que se cobraron (horario de Bolivia)."
    >
      <ReporteVentas />
    </MarcoAdmin>
  )
}
