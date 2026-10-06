import { isApiError } from '../api.ts'

const moneda = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' })

const fechaHora = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/La_Paz',
})

export function formatearMonto(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : moneda.format(valor)
}

/**
 * El backend guarda y devuelve las fechas en UTC pero sin sufijo "Z"
 * ("2026-10-01T14:30:00"). Sin el sufijo, JavaScript las tomaría como hora local
 * y mostraría la hora equivocada, así que se lo agregamos antes de convertir.
 */
export function aFecha(iso: string): Date {
  const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/.test(iso)
  return new Date(tieneZona ? iso : `${iso}Z`)
}

/** Fecha y hora en horario de Bolivia. */
export function formatearFecha(iso: string | null | undefined): string {
  return iso ? fechaHora.format(aFecha(iso)) : '—'
}

/** Convierte lo escrito en un input ("12,50" o "12.5") a número >= 0, o null si no es válido. */
export function parseMonto(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  return Number.isFinite(valor) && valor >= 0 ? valor : null
}

export function mensajeDeError(error: unknown): string {
  return isApiError(error) ? error.message : 'Ocurrió un error inesperado'
}

export function esAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}