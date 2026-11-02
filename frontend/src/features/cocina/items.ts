import type { DetallePedido } from '../../apis/pedidos.ts'

/** Una pizza lleva tamaño (o es mitad y mitad). Los combos y las bebidas se sacan aparte. */
export function esPizza(detalle: DetallePedido): boolean {
  return detalle.combo_id === null && (detalle.is_mitad || detalle.tamano_id !== null)
}

/** Lo que hay que preparar: «Pepperoni», «½ Hawaiana + ½ Torazo» o el nombre del combo. */
export function nombreDetalle(detalle: DetallePedido, nombresCombos: Record<number, string>): string {
  if (detalle.is_mitad) {
    const mitades = [...detalle.mitades].sort((a, b) => a.mitad - b.mitad).map((m) => `½ ${m.producto?.nombre ?? '—'}`)
    return mitades.length > 0 ? mitades.join(' + ') : 'Pizza mitad y mitad'
  }
  if (detalle.combo_id !== null) return nombresCombos[detalle.combo_id] ?? `Combo #${detalle.combo_id}`
  return detalle.producto_nombre ?? 'Producto'
}

export interface ExtraVisible {
  id: string
  nombre: string
  cantidad: number
  /** De qué mitad es el extra; null si es de la pizza entera. */
  mitad: 1 | 2 | null
}

/** Los extras de una pizza, los de la pizza entera y los de cada mitad. */
export function extrasDePizza(detalle: DetallePedido): ExtraVisible[] {
  const enteros = detalle.extras.map(
    (e): ExtraVisible => ({ id: `e${e.id}`, nombre: e.ingrediente?.nombre ?? 'Extra', cantidad: e.cantidad, mitad: null }),
  )
  const deMitades = [...detalle.mitades]
    .sort((a, b) => a.mitad - b.mitad)
    .flatMap((m) =>
      m.extras.map((e): ExtraVisible => ({ id: `m${e.id}`, nombre: e.ingrediente?.nombre ?? 'Extra', cantidad: e.cantidad, mitad: m.mitad })),
    )
  return [...enteros, ...deMitades]
}

/** «2 pizzas · 1 otro»: lo que lleva el pedido, para reconocerlo de un vistazo en la lista. */
export function resumenItems(detalles: DetallePedido[]): string {
  const unidades = (lista: DetallePedido[]) => lista.reduce((suma, d) => suma + d.cantidad, 0)
  const pizzas = unidades(detalles.filter(esPizza))
  const otros = unidades(detalles.filter((d) => !esPizza(d)))
  const partes: string[] = []
  if (pizzas > 0) partes.push(`${pizzas} ${pizzas === 1 ? 'pizza' : 'pizzas'}`)
  if (otros > 0) partes.push(`${otros} ${otros === 1 ? 'otro' : 'otros'}`)
  return partes.join(' · ') || 'Sin productos'
}

/** 0 = personal, 1 = mediana, 2 = familiar. Define qué tan grande se dibuja el círculo de la pizza. */
export type EscalaTamano = 0 | 1 | 2

/**
 * Los tamaños los crea el administrador y no traen medidas, así que se reconocen por el nombre.
 * Un nombre desconocido se dibuja mediano: el nombre del tamaño siempre se muestra al lado.
 */
export function escalaTamano(nombre: string | null): EscalaTamano {
  const n = (nombre ?? '').toLowerCase()
  if (/person|peque|chic|individual/.test(n)) return 0
  if (/famil|grand|xl|gigante/.test(n)) return 2
  return 1
}
