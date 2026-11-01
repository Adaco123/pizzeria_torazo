import { useEffect, useState } from 'react'
import { categoriasApi } from '../../apis/categorias.ts'
import { combosApi } from '../../apis/combos.ts'
import { ingredientesApi } from '../../apis/ingredientes.ts'
import { productosApi } from '../../apis/productos.ts'
import { tamanosApi } from '../../apis/tamanos.ts'
import type { Categoria } from '../../apis/categorias.ts'
import type { Combo } from '../../apis/combos.ts'
import type { Ingrediente, IngredienteTamano } from '../../apis/ingredientes.ts'
import type { Producto } from '../../apis/productos.ts'
import type { Tamano } from '../../apis/tamanos.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'

export interface DatosCatalogo {
  categorias: Categoria[]
  productos: Producto[]
  tamanos: Tamano[]
  ingredientes: Ingrediente[]
  combos: Combo[]
  /** Precio extra de cada ingrediente según el tamaño. */
  preciosIngrediente: IngredienteTamano[]
}

/** Todo el catálogo, incluidos los registros inactivos. `recargar()` lo vuelve a pedir. */
export function useCatalogoAdmin() {
  const [datos, setDatos] = useState<DatosCatalogo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const opts = { signal: controller.signal }

    Promise.all([
      categoriasApi.listar(opts),
      productosApi.listar(opts),
      tamanosApi.listar(opts),
      ingredientesApi.listar(opts),
      combosApi.listar(opts),
      ingredientesApi.listarPreciosPorTamano(opts),
    ])
      .then(([categorias, productos, tamanos, ingredientes, combos, preciosIngrediente]) => {
        setDatos({ categorias, productos, tamanos, ingredientes, combos, preciosIngrediente })
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })

    return () => controller.abort()
  }, [version])

  function recargar(): void {
    setVersion((v) => v + 1)
  }

  return { datos, error, recargar }
}