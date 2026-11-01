/**
 * Lo que más se vende en ESTE navegador. El backend todavía no guarda favoritos ni popularidad,
 * así que la caja lo aprende sola: cada vez que se agrega una pizza o un extra, suma uno.
 */
const CLAVE = 'pizzeria.usoCaja'

export interface Uso {
  productos: Record<number, number>
  extras: Record<number, number>
}

export function leerUso(): Uso {
  try {
    const bruto = localStorage.getItem(CLAVE)
    if (bruto) {
      const dato = JSON.parse(bruto) as Partial<Uso>
      return { productos: dato.productos ?? {}, extras: dato.extras ?? {} }
    }
  } catch {
    // Sin almacenamiento o dato dañado: se empieza de cero.
  }
  return { productos: {}, extras: {} }
}

export function registrarUso(productoId: number, extraIds: number[]): void {
  try {
    const uso = leerUso()
    uso.productos[productoId] = (uso.productos[productoId] ?? 0) + 1
    for (const id of extraIds) uso.extras[id] = (uso.extras[id] ?? 0) + 1
    localStorage.setItem(CLAVE, JSON.stringify(uso))
  } catch {
    // Sin almacenamiento: simplemente no se recuerda.
  }
}

/**
 * Más usados primero. A igual uso: por nombre, o por orden de creación (`id`) cuando todavía no
 * hay historial y conviene que salgan primero los ingredientes que el negocio cargó primero.
 */
export function ordenarPorUso<T extends { id: number; nombre: string }>(
  items: T[],
  usos: Record<number, number>,
  desempate: 'nombre' | 'id' = 'nombre',
): T[] {
  return items.toSorted(
    (a, b) =>
      (usos[b.id] ?? 0) - (usos[a.id] ?? 0) ||
      (desempate === 'id' ? a.id - b.id : a.nombre.localeCompare(b.nombre, 'es')),
  )
}
