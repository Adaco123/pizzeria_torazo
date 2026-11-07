import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './ErrorPage.module.css'

interface Props {
  icono: LucideIcon
  titulo: string
  children?: ReactNode
  /** Botones al pie. */
  acciones?: ReactNode
  /** true = ocupa toda la pantalla (fuera del menú, como el error general). */
  pantallaCompleta?: boolean
  alerta?: boolean
}

/** Tarjeta centrada para avisos de pantalla: sin acceso, no encontrada, error inesperado. */
export function PaginaMensaje({ icono: Icono, titulo, children, acciones, pantallaCompleta = false, alerta = false }: Props) {
  const Marco = pantallaCompleta ? 'main' : 'section'
  return (
    <Marco className={pantallaCompleta ? styles.root : styles.dentro}>
      <div className={styles.card} role={alerta ? 'alert' : undefined}>
        <span className={styles.icono}>
          <Icono size={30} aria-hidden="true" />
        </span>
        <h1>{titulo}</h1>
        {children}
        {acciones && <div className={styles.acciones}>{acciones}</div>}
      </div>
    </Marco>
  )
}
