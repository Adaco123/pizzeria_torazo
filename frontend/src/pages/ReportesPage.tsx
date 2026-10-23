import { Link } from 'react-router'
import styles from '../features/catalogo/Catalogo.module.css'
import { ReporteVentas } from '../features/reportes/ReporteVentas.tsx'

export function ReportesPage() {
  return (
    <section className={styles.page}>
      <Link to="/admin" className={styles.back}>
        ← Administración
      </Link>
      <h1>Reportes de ventas</h1>
      <p className={styles.muted}>
        Cuenta los pedidos cobrados y no cancelados, por el día en que se cobraron (horario de Bolivia).
      </p>
      <ReporteVentas />
    </section>
  )
}
