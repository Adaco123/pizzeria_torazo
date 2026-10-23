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
