import type { MetodoPago, PagoCobro } from '../../api.ts'
import { parseMonto } from '../../utils/formato.ts'
import { redondear, TOLERANCIA } from '../cobro/facturacion.ts'

/** Billetes que se le ofrecen al cajero como atajo para "con cuánto paga el cliente". */
const BILLETES = [10, 20, 50, 100, 200]

export type ModoPago = 'unico' | 'dividido'

export interface EntradaPagos {
  /** Total del pedido, lo que hay que cobrar. */
  total: number
  metodos: MetodoPago[]
  modo: ModoPago
  /** Modo único: método con el que paga. */
  metodoId: number | null
  /** Efectivo que entrega el cliente. Vacío significa que paga justo, sin vuelto. */
  recibido: string
  /** Modo dividido: parte que paga en efectivo. */
  montoEfectivo: string
  /** Modo dividido: método con el que paga el resto. */
  otroMetodoId: number | null
}

export type ResultadoPagos =
  | { ok: true; pagos: PagoCobro[]; vuelto: number }
  | { ok: false; error: string }

const bs = (valor: number) => `Bs ${valor.toFixed(2)}`

export function esEfectivo(metodo: MetodoPago | undefined): boolean {
  return metodo?.nombre.trim().toLowerCase() === 'efectivo'
}

function pagoEfectivo(
  metodo: MetodoPago,
  monto: number,
  textoRecibido: string,
): { ok: true; pago: PagoCobro; vuelto: number } | { ok: false; error: string } {
  let recibido = monto
  if (textoRecibido.trim() !== '') {
    const valor = parseMonto(textoRecibido)
    if (valor === null) return { ok: false, error: 'El efectivo recibido no es válido' }
    recibido = redondear(valor)
  }
  if (recibido + TOLERANCIA < monto) {
    return { ok: false, error: `El efectivo recibido no alcanza: faltan ${bs(redondear(monto - recibido))}` }
  }
  return {
    ok: true,
    pago: { metodo_id: metodo.id, monto, monto_recibido: recibido },
    vuelto: redondear(recibido - monto),
  }
}

/**
 * Convierte lo que el cajero eligió en la lista de pagos que espera el backend, o explica
 * qué falta. La suma de los pagos siempre es igual al total.
 */
export function armarPagos(entrada: EntradaPagos): ResultadoPagos {
  const total = redondear(entrada.total)
  if (total <= 0) return { ok: false, error: 'El total del pedido debe ser mayor a 0' }

  if (entrada.modo === 'unico') {
    const metodo = entrada.metodos.find((m) => m.id === entrada.metodoId)
    if (!metodo) return { ok: false, error: 'Elige cómo paga el cliente' }
    if (!esEfectivo(metodo)) return { ok: true, pagos: [{ metodo_id: metodo.id, monto: total }], vuelto: 0 }

    const efectivo = pagoEfectivo(metodo, total, entrada.recibido)
    return efectivo.ok ? { ok: true, pagos: [efectivo.pago], vuelto: efectivo.vuelto } : efectivo
  }

  const efectivo = entrada.metodos.find((m) => esEfectivo(m))
  if (!efectivo) return { ok: false, error: 'No hay un método de pago en efectivo configurado' }
  const otro = entrada.metodos.find((m) => m.id === entrada.otroMetodoId && !esEfectivo(m))
  if (!otro) return { ok: false, error: 'Elige con qué paga el resto' }

  const parte = parseMonto(entrada.montoEfectivo)
  if (parte === null || parte <= 0) return { ok: false, error: 'Escribe cuánto paga en efectivo' }
  const enEfectivo = redondear(parte)
  if (enEfectivo >= total - TOLERANCIA) {
    return { ok: false, error: 'Si paga todo en efectivo, usa el pago único' }
  }

  const pagoEnEfectivo = pagoEfectivo(efectivo, enEfectivo, entrada.recibido)
  if (!pagoEnEfectivo.ok) return pagoEnEfectivo
  return {
    ok: true,
    pagos: [pagoEnEfectivo.pago, { metodo_id: otro.id, monto: redondear(total - enEfectivo) }],
    vuelto: pagoEnEfectivo.vuelto,
  }
}

/** Montos sugeridos para "recibido": los billetes que alcanzan para pagar el total. */
export function sugerenciasDeRecibido(total: number): number[] {
  const mayores = BILLETES.filter((billete) => billete > total + TOLERANCIA).slice(0, 3)
  if (mayores.length > 0) return mayores
  const redondeado = Math.ceil(total / 100) * 100
  return redondeado > total + TOLERANCIA ? [redondeado] : []
}
