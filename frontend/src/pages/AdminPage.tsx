import { Link } from 'react-router'
import styles from '../features/catalogo/Catalogo.module.css'

export function AdminPage() {
  return (
    <section className={styles.page}>
      <h1>Administración</h1>

      <section className={styles.card}>
        <h2>Catálogo</h2>
        <p className={styles.muted}>
          Productos con sus tamaños y precios, categorías, ingredientes y combos.
        </p>
        <div>
          <Link to="/admin/catalogo">Abrir catálogo →</Link>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Usuarios</h2>
        <p className={styles.muted}>
          Crear cuentas, cambiar roles, desactivar a quien ya no trabaja y restablecer contraseñas.
        </p>
        <div>
          <Link to="/admin/usuarios">Administrar usuarios →</Link>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Repartidores</h2>
        <p className={styles.muted}>
          Personas o empresas que llevan los domicilios. El costo de envío lo escribe el cajero al cobrar.
        </p>
        <div>
          <Link to="/admin/repartidores">Administrar repartidores →</Link>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Reportes</h2>
        <p className={styles.muted}>
          Ventas por día, por método de pago y por producto, los mejores clientes, los envíos y las cancelaciones con devolución.
        </p>
        <div>
          <Link to="/admin/reportes">Ver reportes →</Link>
        </div>
      </section>
    </section>
  )
}