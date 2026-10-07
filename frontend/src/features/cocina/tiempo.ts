import { aFecha } from '../../utils/formato.ts'

/** Pasados estos minutos desde que se creó el pedido, la tarjeta se marca como urgente. */
export const MINUTOS_URGENTE = 20

export function minutosDesde(fechaIso: string, ahora: number): number {
  return Math.max(0, Math.floor((ahora - aFecha(fechaIso).getTime()) / 60_000))
}

export function textoTiempo(minutos: number): string {
  if (minutos < 1) return 'Recién llegado'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `Hace ${horas} h` : `Hace ${horas} h ${resto} min`
}