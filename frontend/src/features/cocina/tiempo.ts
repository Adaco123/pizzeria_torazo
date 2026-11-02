import type { Pedido } from '../../apis/pedidos.ts'
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

/** Minutos que faltan para la hora prometida (negativo = ya pasó). */
export function minutosParaPromesa(horaPrometida: string, ahora: number): number {
  return Math.ceil((aFecha(horaPrometida).getTime() - ahora) / 60_000)
}

const horaCorta = new Intl.DateTimeFormat('es-BO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/La_Paz',
})

/** "Prometido 20:35". */
export function textoHoraPrometida(horaPrometida: string): string {
  return `Prometido ${horaCorta.format(aFecha(horaPrometida))}`
}

/** "Faltan 8 min" o "Atrasado 5 min". */
export function textoPromesa(minutosParaLaHora: number): string {
  if (minutosParaLaHora > 0) return `Faltan ${minutosParaLaHora} min`
  if (minutosParaLaHora === 0) return 'Es la hora'
  return `Atrasado ${-minutosParaLaHora} min`
}

export interface ProgresoPedido {
  /** Cuánto del plazo ya pasó, de 0 a 100 (llena el anillo de tiempo). */
  porcentaje: number
  /** Texto corto del centro del anillo: «12'» faltan, «−4'» de atraso; sin hora prometida, los minutos de espera. */
  etiqueta: string
  atrasado: boolean
}

/**
 * Qué tan avanzado va el plazo de un pedido. El plazo es hasta la hora prometida; los pedidos
 * viejos sin hora prometida usan `MINUTOS_URGENTE`, igual que la marca de urgente de siempre.
 */
export function progresoPedido(pedido: Pick<Pedido, 'fecha' | 'hora_prometida'>, ahora: number): ProgresoPedido {
  const creado = aFecha(pedido.fecha).getTime()
  const limite = pedido.hora_prometida ? aFecha(pedido.hora_prometida).getTime() : creado + MINUTOS_URGENTE * 60_000
  const faltan = Math.ceil((limite - ahora) / 60_000)
  const porcentaje = Math.min(100, Math.max(0, ((ahora - creado) / Math.max(1, limite - creado)) * 100))
  const atrasado = pedido.hora_prometida ? faltan < 0 : faltan <= 0

  let etiqueta = `${minutosDesde(pedido.fecha, ahora)}'`
  if (pedido.hora_prometida) etiqueta = faltan < 0 ? `−${-faltan}'` : `${faltan}'`
  return { porcentaje, etiqueta, atrasado }
}
