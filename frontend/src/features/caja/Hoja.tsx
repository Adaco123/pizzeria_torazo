import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Ticket.module.css'

interface Props {
  titulo: string
  /** Ventana más ancha (para contenido con tablas o listas largas). */
  ancha?: boolean
  onCerrar: () => void
  children: ReactNode
}

/** Ventana flotante del cajero: centrada en PC, pegada abajo en celular. Se cierra con Escape. */
export function Hoja({ titulo, ancha = false, onCerrar, children }: Props) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return createPortal(
    <div className={styles.fondoHoja} onClick={onCerrar}>
      <div
        className={ancha ? `${styles.hoja} ${styles.hojaAncha}` : styles.hoja}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.hojaCabecera}>
          <h2>{titulo}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.hojaCuerpo}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
