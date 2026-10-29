import { createContext, useContext } from 'react'

export type ToastTipo = 'exito' | 'error'

export interface ToastApi {
  /** Aviso verde: algo salió bien. */
  exito: (mensaje: string) => void
  /**
   * Aviso rojo. Acepta un texto o directamente lo que atrapaste en un `catch`
   * (si es un ApiError muestra el mensaje del backend).
   */
  error: (causa: unknown) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return value
}