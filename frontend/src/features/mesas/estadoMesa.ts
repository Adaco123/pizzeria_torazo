import type { Mesa, ResumenCuenta } from '../../apis/mesas.ts'
import { formatearMonto } from '../../utils/formato.ts'
import { minutosDesde } from '../cocina/tiempo.ts'

export type EstadoMesa = 'libre' | 'ocupada' | 'lista' | 'cuenta'
export type FiltroMesas = 'todas' | 'libres' | 'ocupadas' | 'llevar' | 'cuenta'

/** Cuenta abierta de la mesa, o null si está libre. */
export function cuentaDe(mesa: Mesa): ResumenCuenta | null {
  return mesa.cuenta?.estado === 'abierta' ? mesa.cuenta : null
}

/** Mismo orden de prioridad de siempre: cuenta pedida, luego lista para llevar, luego ocupada. */
export function estadoDeMesa(mesa: Mesa): EstadoMesa {
  const cuenta = cuentaDe(mesa)
  if (!cuenta) return 'libre'
  if (cuenta.pidio_cuenta) return 'cuenta'
  if (cuenta.rondas_listas > 0) return 'lista'
  return 'ocupada'
}

/** Cada filtro es también un contador: el número y las mesas que quedan visibles siempre coinciden. */
export const FILTROS: { id: FiltroMesas; texto: string; coincide: (mesa: Mesa) => boolean }[] = [
  { id: 'todas', texto: 'Todas', coincide: () => true },
  { id: 'libres', texto: 'Libres', coincide: (m) => cuentaDe(m) === null },
  { id: 'ocupadas', texto: 'Ocupadas', coincide: (m) => cuentaDe(m) !== null },
  { id: 'llevar', texto: 'Para llevar', coincide: (m) => (cuentaDe(m)?.rondas_listas ?? 0) > 0 },
  { id: 'cuenta', texto: 'Piden cuenta', coincide: (m) => cuentaDe(m)?.pidio_cuenta === true },
]

/** Texto para el lector de pantalla: número de mesa y su estado. */
export function etiquetaMesa(mesa: Mesa): string {
  const cuenta = cuentaDe(mesa)
  if (!cuenta) return `Mesa ${mesa.numero}, libre`
  const partes = [`Mesa ${mesa.numero}`, 'ocupada', formatearMonto(cuenta.total)]
  if (cuenta.pidio_cuenta) partes.push('pidió la cuenta')
  if (cuenta.rondas_listas > 0) partes.push(`${cuenta.rondas_listas} lista(s) para llevar`)
  if (cuenta.rondas_en_cocina > 0) partes.push(`${cuenta.rondas_en_cocina} en cocina`)
  return partes.join(', ')
}

/** «35 min», «1 h 5 min». */
export function textoAbierta(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

export type TipoAtencion = 'entregar' | 'cobrar' | 'sinPedidos'

export interface ItemAtencion {
  clave: string
  tipo: TipoAtencion
  mesa: Mesa
  cuenta: ResumenCuenta
  texto: string
}

/** Una mesa abierta sin pedir nada por tanto tiempo probablemente se olvidó. */
const MINUTOS_SIN_PEDIDOS = 10

const ORDEN: Record<TipoAtencion, number> = { entregar: 0, cobrar: 1, sinPedidos: 2 }

/** Lo que necesita que alguien haga algo ahora, lo más urgente primero. */
export function itemsDeAtencion(mesas: Mesa[], ahora: number): ItemAtencion[] {
  const items: ItemAtencion[] = []
  for (const mesa of mesas) {
    const cuenta = cuentaDe(mesa)
    if (!cuenta) continue
    if (cuenta.rondas_listas > 0) {
      const n = cuenta.rondas_listas
      items.push({
        clave: `entregar-${cuenta.id}`,
        tipo: 'entregar',
        mesa,
        cuenta,
        texto: `${n} ${n === 1 ? 'ronda lista' : 'rondas listas'} para llevar`,
      })
    }
    if (cuenta.pidio_cuenta) {
      items.push({
        clave: `cobrar-${cuenta.id}`,
        tipo: 'cobrar',
        mesa,
        cuenta,
        texto: `Pidió la cuenta · ${formatearMonto(cuenta.total)}`,
      })
    }
    const abierta = minutosDesde(cuenta.abierta_en, ahora)
    if (cuenta.rondas === 0 && abierta >= MINUTOS_SIN_PEDIDOS) {
      items.push({
        clave: `sin-${cuenta.id}`,
        tipo: 'sinPedidos',
        mesa,
        cuenta,
        texto: `Abierta sin pedidos hace ${abierta} min`,
      })
    }
  }
  return items.toSorted((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo] || a.mesa.numero - b.mesa.numero)
}
