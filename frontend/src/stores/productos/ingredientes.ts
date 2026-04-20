import { defineStore } from "pinia"
import { ref, computed } from "vue"
import {
  getIngredientes, getIngrediente, createIngrediente, updateIngrediente, deleteIngrediente,
  getIngredientesTamanos, getIngredienteTamano, createIngredienteTamano,
  updateIngredienteTamano, deleteIngredienteTamano,
  getProductoIngredientes, addIngredienteToProducto, removeIngredienteFromProducto,
  type Ingrediente, type IngredientePayload,
  type IngredienteTamano, type IngredienteTamanoPayload,
  type ProductoIngrediente, type ProductoIngredientePayload
} from "@/services/ingrediente_service"
import { getErrorMessage } from "@/utils/errors.ts"

const CACHE_TTL = 5 * 60 * 1000

export const useStoreIngredientes = defineStore("ingredientes", () => {

  
  const ingredientes              = ref<Ingrediente[]>([])
  const ingrediente_seleccionado  = ref<Ingrediente | null>(null)
  const ingredientes_tamanos      = ref<IngredienteTamano[]>([])
  const ingredientes_producto     = ref<ProductoIngrediente[]>([])
  const lastFetch                 = ref<number | null>(null)
  const loading                   = ref({ fetch: false, guardar: false, eliminar: false })
  const error                     = ref<string | null>(null)

  
  const totalIngredientes = computed(() => ingredientes.value.length)

  const soloActivos = computed(() =>
    ingredientes.value.filter(i => i.activo)
  )

  const conPrecioExtra = computed(() =>
    ingredientes.value.filter(i => i.precio_extra > 0)
  )

  const buscarPorNombre = computed(() => (termino: string) =>
    ingredientes.value.filter(i =>
      i.nombre.toLowerCase().includes(termino.toLowerCase())
    )
  )

  const tamanosPorIngrediente = computed(() => (ingredienteId: number) =>
    ingredientes_tamanos.value.filter(it => it.ingrediente_id === ingredienteId)
  )

  
  function cacheEsValido(): boolean {
    return lastFetch.value !== null &&
           (Date.now() - lastFetch.value) < CACHE_TTL &&
           ingredientes.value.length > 0
  }

  function invalidarCache(): void {
    lastFetch.value = null
  }

  
  async function fetchIngredientes(force = false): Promise<void> {
    if (!force && (loading.value.fetch || cacheEsValido())) return

    loading.value.fetch = true
    error.value         = null
    try {
      const res             = await getIngredientes()
      ingredientes.value    = res.data
      lastFetch.value       = Date.now()
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function buscarIngrediente(id: number): Promise<void> {
    const enMemoria = ingredientes.value.find(i => i.id === id)
    if (enMemoria) {
      ingrediente_seleccionado.value = enMemoria
      return
    }

    loading.value.fetch = true
    error.value         = null
    try {
      const res                      = await getIngrediente(id)
      ingrediente_seleccionado.value = res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function agregarIngrediente(payload: IngredientePayload): Promise<Ingrediente | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await createIngrediente(payload)
      ingredientes.value.push(res.data)
      invalidarCache()
      return res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function editarIngrediente(id: number, payload: Partial<IngredientePayload>): Promise<Ingrediente | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res   = await updateIngrediente(id, payload)
      const index = ingredientes.value.findIndex(i => i.id === id)
      if (index !== -1) ingredientes.value[index] = res.data
      if (ingrediente_seleccionado.value?.id === id) {
        ingrediente_seleccionado.value = res.data
      }
      invalidarCache()
      return res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function eliminarIngrediente(id: number): Promise<boolean> {
    loading.value.eliminar = true
    error.value            = null
    try {
      await deleteIngrediente(id)
      ingredientes.value = ingredientes.value.filter(i => i.id !== id)
      if (ingrediente_seleccionado.value?.id === id) {
        ingrediente_seleccionado.value = null
      }
      invalidarCache()
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.eliminar = false
    }
  }

  
  async function fetchIngredientesTamanos(): Promise<void> {
    loading.value.fetch = true
    error.value         = null
    try {
      const res                  = await getIngredientesTamanos()
      ingredientes_tamanos.value = res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function agregarIngredienteTamano(payload: IngredienteTamanoPayload): Promise<boolean> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await createIngredienteTamano(payload)
      ingredientes_tamanos.value.push(res.data)
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.guardar = false
    }
  }

  async function editarIngredienteTamano(
    ingredienteId: number,
    tamanoId: number,
    precio_extra: number
  ): Promise<boolean> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res   = await updateIngredienteTamano(ingredienteId, tamanoId, precio_extra)
      const index = ingredientes_tamanos.value.findIndex(
        it => it.ingrediente_id === ingredienteId && it.tamano_id === tamanoId
      )
      if (index !== -1) ingredientes_tamanos.value[index] = res.data
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.guardar = false
    }
  }

  async function eliminarIngredienteTamano(ingredienteId: number, tamanoId: number): Promise<boolean> {
    loading.value.eliminar = true
    error.value            = null
    try {
      await deleteIngredienteTamano(ingredienteId, tamanoId)
      ingredientes_tamanos.value = ingredientes_tamanos.value.filter(
        it => !(it.ingrediente_id === ingredienteId && it.tamano_id === tamanoId)
      )
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.eliminar = false
    }
  }

  
  async function fetchIngredientesProducto(productoId: number): Promise<void> {
    loading.value.fetch = true
    error.value         = null
    try {
      const res                    = await getProductoIngredientes(productoId)
      ingredientes_producto.value  = res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function agregarIngredienteAProducto(
    productoId: number,
    payload: ProductoIngredientePayload
  ): Promise<boolean> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await addIngredienteToProducto(productoId, payload)
      ingredientes_producto.value.push(res.data)
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.guardar = false
    }
  }

  async function eliminarIngredienteDeProducto(
    productoId: number,
    ingredienteId: number
  ): Promise<boolean> {
    loading.value.eliminar = true
    error.value            = null
    try {
      await removeIngredienteFromProducto(productoId, ingredienteId)
      ingredientes_producto.value = ingredientes_producto.value.filter(
        pi => !(pi.producto_id === productoId && pi.ingrediente_id === ingredienteId)
      )
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.eliminar = false
    }
  }

  return {
    
    ingredientes, ingrediente_seleccionado,
    ingredientes_tamanos, ingredientes_producto,
    loading, error,
    
    totalIngredientes, soloActivos, conPrecioExtra,
    buscarPorNombre, tamanosPorIngrediente,
    
    fetchIngredientes, buscarIngrediente,
    agregarIngrediente, editarIngrediente, eliminarIngrediente,
    
    fetchIngredientesTamanos, agregarIngredienteTamano,
    editarIngredienteTamano, eliminarIngredienteTamano,
    
    fetchIngredientesProducto, agregarIngredienteAProducto, eliminarIngredienteDeProducto
  }
})