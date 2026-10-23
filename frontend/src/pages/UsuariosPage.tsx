import { Link } from 'react-router'
import styles from '../features/catalogo/Catalogo.module.css'
import { UsuariosAdmin } from '../features/usuarios/UsuariosAdmin.tsx'

export function UsuariosPage() {
  return (
    <section className={styles.page}>
      <Link to="/admin" className={styles.back}>
        ← Administración
      </Link>
      <h1>Usuarios</h1>
      <p className={styles.muted}>
        Solo el administrador crea, edita y desactiva usuarios. Cada persona cambia su propia contraseña
        en «Mi cuenta».
      </p>
      <UsuariosAdmin />
    </section>
  )
}
