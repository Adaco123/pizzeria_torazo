import { useAuth } from '../auth/auth-context.ts'
import styles from '../features/catalogo/Catalogo.module.css'
import { ContrasenaForm } from '../features/usuarios/ContrasenaForm.tsx'

/** Pantalla de cada usuario, sea cual sea su rol. */
export function CuentaPage() {
  const { sesion } = useAuth()

  return (
    <section className={styles.page}>
      <h1>Mi cuenta</h1>
      <p className={styles.muted}>
        {sesion?.nombre} · {sesion?.rol ?? 'sin rol'}
      </p>
      <ContrasenaForm modo="propia" />
    </section>
  )
}
