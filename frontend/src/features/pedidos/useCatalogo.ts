import { useEffect, useState } from 'react'
import {
  categoriasApi,
  combosApi,
  ingredientesApi,
  productosApi,
  tamanosApi,
} from '../../api.ts'
import type { Categoria, Combo, Ingrediente, IngredienteTamano, Producto, Tamano } from '../../api.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'

const REFRESCO_PRODUCTOS_MS = 30_000

export interface Catalogo {
  categorias: Categoria[]
  productos: Producto[]
  combos: Combo[]
  ingredientes: Ingrediente[]
  tamanos: Tamano[]
  /** Precio de cada extra según el tamaño de la pizza. */
  preciosExtra: IngredienteTamano[]
}

/** Todo lo que se puede vender, cargado una sola vez. */
export function useCatalogo() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const opts = { signal: controller.signal }

    Promise.all([
      categoriasApi.listar(opts),
      productosApi.listar(opts),
      combosApi.listar(opts),
      ingredientesApi.listar(opts),
      tamanosApi.listar(opts),
      // Si falla, los extras se muestran con su precio base en vez de bloquear la caja.
      ingredientesApi.listarPreciosPorTamano(opts).catch((): IngredienteTamano[] => []),
    ])
      .then(([categorias, productos, combos, ingredientes, tamanos, preciosExtra]) => {
        setCatalogo({ categorias, productos, combos, ingredientes, tamanos, preciosExtra })
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })

    return () => controller.abort()
  }, [])

  // Cocina puede marcar un producto como agotado mientras la caja está abierta: se refresca la
  // lista de productos cada tanto (solo con la pestaña visible). El servidor igual lo rechaza.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      productosApi
        .listar()
        .then((productos) => setCatalogo((actual) => (actual ? { ...actual, productos } : actual)))
        .catch(() => {
          /* se conserva la lista anterior */
        })
    }, REFRESCO_PRODUCTOS_MS)
    return () => window.clearInterval(id)
  }, [])

  return { catalogo, error }
}