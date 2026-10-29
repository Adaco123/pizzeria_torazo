import { useState } from 'react'
import { useToast } from '../../toast/toast-context.ts'

/**
 * Ejecuta una acción contra el backend con aviso verde si sale bien y rojo si falla.
 * Devuelve `{ valor }` si salió bien o `null` si falló, y llama a `alTerminar` solo si salió bien.
 */
export function useAccion(alTerminar: () => void) {
  const toast = useToast()
  const [ocupado, setOcupado] = useState(false)

  async function ejecutar<T>(
    accion: () => Promise<T>,
    exito: string,
    mensajeError?: (error: unknown) => string,
  ): Promise<{ valor: T } | null> {
    setOcupado(true)
    try {
      const valor = await accion()
      toast.exito(exito)
      alTerminar()
      return { valor }
    } catch (e) {
      toast.error(mensajeError ? mensajeError(e) : e)
      return null
    } finally {
      setOcupado(false)
    }
  }

  return { ocupado, ejecutar }
}