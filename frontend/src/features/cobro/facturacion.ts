import { facturasApi, isApiError } from '../../api.ts'
import type { Factura, FacturaCreate } from '../../api.ts'

/** Redondea a 2 decimales para evitar restos de coma flotante (0.1 + 0.2). */
export function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

/** Diferencia máxima que se tolera al comparar montos. */
export const TOLERANCIA = 0.005

const PREFIJO = 'FAC-'
const FORMATO = /^FAC-(\d+)$/

/**
 * El backend exige que el frontend mande el `numero_factura` (único, máx. 20 caracteres).
 * Se toma el mayor "FAC-000123" existente y se suma 1; los números con otro formato se ignoran.
 */
export function siguienteNumeroFactura(existentes: string[]): string {
  let mayor = 0
  for (const numero of existentes) {
    const coincidencia = FORMATO.exec(numero)
    if (coincidencia) mayor = Math.max(mayor, Number(coincidencia[1]))
  }
  return `${PREFIJO}${String(mayor + 1).padStart(6, '0')}`
}

/**
 * Crea la factura. Si dos cajeros piden el mismo número a la vez, el backend responde 409:
 * se vuelve a calcular el número y se reintenta (hasta 3 veces).
 */
export async function crearFactura(datos: Omit<FacturaCreate, 'numero_factura'>): Promise<Factura> {
  let ultimoConflicto: unknown = null

  for (let intento = 0; intento < 3; intento++) {
    const existentes = await facturasApi.listar()
    const numero = siguienteNumeroFactura(existentes.map((f) => f.numero_factura))
    try {
      return await facturasApi.crear({ ...datos, numero_factura: numero })
    } catch (e) {
      if (isApiError(e) && e.status === 409) {
        ultimoConflicto = e
        continue
      }
      throw e
    }
  }
  throw ultimoConflicto
}