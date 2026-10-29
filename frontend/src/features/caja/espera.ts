import type { TipoEntregaNombre } from '../pedidos/estados.ts'

/** Minutos que se prometen por defecto (el mismo valor que usa el servidor si no se envía otro). */
export function esperaSugerida(tipo: TipoEntregaNombre): number {
  return tipo === 'Domicilio' ? 40 : 20
}

export const OPCIONES_ESPERA = [10, 15, 20, 30, 40, 45, 60, 90]
