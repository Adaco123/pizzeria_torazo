import { useEffect, useRef, useState } from 'react'
import { productosApi } from '../../../apis/productos.ts'
import type { Ingrediente } from '../../../apis/ingredientes.ts'
import type { Producto, ProductoTamanoPrecio } from '../../../apis/productos.ts'
import { esAbort } from '../../../utils/formato.ts'

export interface DatosPizza {
  /** Precio en cada tamaño, de menor a mayor id de tamaño. */
  precios: ProductoTamanoPrecio[]
  /** Nombres de sus ingredientes (para buscar "piña" y mostrar qué lleva). */
  ingredientes: string[]
  /** No se pudieron leer los precios de esta pizza. */
  fallo: boolean
}

const EN_PARALELO = 6

async function conLimite<T>(items: T[], limite: number, tarea: (item: T) => Promise<void>) {
  let siguiente = 0
  const trabajadores = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (siguiente < items.length) await tarea(items[siguiente++])
  })
  await Promise.all(trabajadores)
}

/**
 * Precios por tamaño e ingredientes de cada pizza. El listado de productos no los trae, así que se
 * piden una vez por pizza (de a pocas a la vez) y se guardan mientras la caja está abierta.
 * Cuando el backend ofrezca un solo endpoint para todo esto, solo cambia este archivo.
 */
export function useDatosPizzas(pizzas: Producto[], ingredientes: Ingrediente[]) {
  const [datos, setDatos] = useState<Record<number, DatosPizza>>({})
  const cargadas = useRef(new Set<number>())
  const clave = pizzas.map((p) => p.id).join(',')

  useEffect(() => {
    const controller = new AbortController()
    const opts = { signal: controller.signal }
    const nombres = new Map(ingredientes.map((i) => [i.id, i.nombre]))
    const pendientes = clave === '' ? [] : clave.split(',').map(Number).filter((id) => !cargadas.current.has(id))

    void conLimite(pendientes, EN_PARALELO, async (id) => {
      let resultado: DatosPizza
      try {
        const [precios, ingredientesPizza] = await Promise.all([
          productosApi.tamanos(id, opts),
          productosApi.ingredientes(id, opts).catch((e: unknown) => {
            if (esAbort(e)) throw e
            return []
          }),
        ])
        resultado = {
          precios: precios.toSorted((a, b) => a.tamano_id - b.tamano_id),
          ingredientes: ingredientesPizza
            .map((pi) => pi.ingrediente?.nombre ?? nombres.get(pi.ingrediente_id) ?? '')
            .filter((n) => n !== ''),
          fallo: false,
        }
      } catch (e) {
        if (esAbort(e)) return
        resultado = { precios: [], ingredientes: [], fallo: true }
      }
      cargadas.current.add(id)
      setDatos((actual) => ({ ...actual, [id]: resultado }))
    })

    return () => controller.abort()
  }, [clave, ingredientes])

  return datos
}
