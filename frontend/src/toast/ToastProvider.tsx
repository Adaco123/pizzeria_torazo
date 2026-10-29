import { useRef, useState, type ReactNode } from 'react'
import { mensajeDeError } from '../utils/formato.ts'
import { ToastContext, type ToastApi, type ToastTipo } from './toast-context.ts'
import styles from './ToastProvider.module.css'

interface ToastItem {
  id: number
  tipo: ToastTipo
  mensaje: string
}

/** Milisegundos que se queda visible cada aviso. Los errores duran más para poder leerlos. */
const DURACION: Record<ToastTipo, number> = { exito: 4000, error: 7000 }

/** Máximo de avisos a la vez; si llegan más, se descartan los más viejos. */
const MAXIMO = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const ultimoId = useRef(0)

  function quitar(id: number): void {
    setToasts((actuales) => actuales.filter((toast) => toast.id !== id))
  }

  // La API se crea una sola vez: así su identidad es estable y los componentes que la
  // usan dentro de un useEffect no se vuelven a ejecutar cada vez que sale un aviso.
  const [api] = useState<ToastApi>(() => {
    function agregar(tipo: ToastTipo, mensaje: string): void {
      ultimoId.current += 1
      const id = ultimoId.current
      setToasts((actuales) => [...actuales.slice(-(MAXIMO - 1)), { id, tipo, mensaje }])
      window.setTimeout(() => {
        setToasts((actuales) => actuales.filter((toast) => toast.id !== id))
      }, DURACION[tipo])
    }

    return {
      exito: (mensaje) => agregar('exito', mensaje),
      error: (causa) => agregar('error', typeof causa === 'string' ? causa : mensajeDeError(causa)),
    }
  })

  return (
    <ToastContext value={api}>
      {children}
      <div className={styles.container}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${toast.tipo === 'error' ? styles.error : styles.exito}`}
            role={toast.tipo === 'error' ? 'alert' : 'status'}
          >
            <span className={styles.mensaje}>{toast.mensaje}</span>
            <button
              className={styles.cerrar}
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => quitar(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}