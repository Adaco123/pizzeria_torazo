import { isApiError } from '../../api.ts'
import { mensajeDeError } from '../../utils/formato.ts'

/**
 * Al eliminar, el backend responde 500 cuando el registro está en uso por otros datos
 * (pedidos, combos, tamaños asignados...). En ese caso se explica y se sugiere desactivar.
 */
export function mensajeEliminar(error: unknown, nombre: string): string {
  if (isApiError(error) && error.status >= 500) {
    return `No se pudo eliminar «${nombre}»: probablemente está en uso. Desactívalo en su lugar.`
  }
  return mensajeDeError(error)
}