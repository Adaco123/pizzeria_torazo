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

  return { catalogo, error }
}