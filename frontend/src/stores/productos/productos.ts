import { defineStore } from "pinia"
import { ref, computed } from "vue"
import {
  getProductos, getProducto, createProducto, updateProducto, deleteProducto,
  toggleActiveProducto, getProductosByCategoria,
  getProductoTamanos, addTamanoToProducto, removeTamanoFromProducto,
  getProductoStock, addStockToProducto, getStockBebidas,
  type Producto, type ProductoPayload, type ProductoTamano,
  type ProductoTamanoPayload, type ProductoStockItem
} from "@/services/producto_service"
import { getErrorMessage } from "@/utils/errors.ts"

const CACHE_TTL        = 5 * 60 * 1000
const ID_CAT_PIZZAS    = 1
const ID_CAT_BEBIDAS   = 2

export const useStoreProductos = defineStore("productos", () => {

  
  const productos             = ref<Producto[]>([])
  const producto_seleccionado = ref<Producto | null>(null)
  const tamanos_producto      = ref<ProductoTamano[]>([])
  const stock_bebidas         = ref<ProductoStockItem[]>([])
  const lastFetch             = ref<number | null>(null)
  const loading               = ref({ fetch: false, guardar: false, eliminar: false, stock: false })
  const error                 = ref<string | null>(null)

  
  const totalProductos = computed(() => productos.value.length)

  const pizzas  = computed(() => productos.value.filter(p => p.categoria_id === ID_CAT_PIZZAS))
  const bebidas = computed(() => productos.value.filter(p => p.categoria_id === ID_CAT_BEBIDAS))
  const otros   = computed(() => productos.value.filter(p =>
    p.categoria_id !== ID_CAT_PIZZAS && p.categoria_id !== ID_CAT_BEBIDAS
  ))

  const soloActivos = computed(() => productos.value.filter(p => p.activo))

  const buscarPorNombre = computed(() => (termino: string) =>
    productos.value.filter(p =>
      p.nombre.toLowerCase().includes(termino.toLowerCase())
    )
  )

  const bebidasAgotadas = computed(() =>
    stock_bebidas.value.filter(b => b.agotado)
  )

  function cacheEsValido(): boolean {
    return lastFetch.value !== null &&
           (Date.now() - lastFetch.value) < CACHE_TTL &&
           productos.value.length > 0
  }

  function invalidarCache(): void {
    lastFetch.value = null
  }

  
  async function fetchProductos(force = false): Promise<void> {
    if (!force && (loading.value.fetch || cacheEsValido())) return

    loading.value.fetch = true
    error.value         = null
    try {
      const res           = await getProductos()
      productos.value     = res.data
      lastFetch.value     = Date.now()
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function fetchProductosByCategoria(categoriaId: number): Promise<void> {
    loading.value.fetch = true
    error.value         = null
    try {
      const res       = await getProductosByCategoria(categoriaId)
      
      const otros     = productos.value.filter(p => p.categoria_id !== categoriaId)
      productos.value = [...otros, ...res.data]
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function buscarProducto(id: number): Promise<void> {
    const enMemoria = productos.value.find(p => p.id === id)
    if (enMemoria) {
      producto_seleccionado.value = enMemoria
      return
    }

    loading.value.fetch = true
    error.value         = null
    try {
      const res                   = await getProducto(id)
      producto_seleccionado.value = res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function agregarProducto(payload: ProductoPayload): Promise<Producto | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await createProducto(payload)
      productos.value.push(res.data)
      invalidarCache()
      return res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function editarProducto(id: number, payload: Partial<ProductoPayload>): Promise<Producto | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res   = await updateProducto(id, payload)
      const index = productos.value.findIndex(p => p.id === id)
      if (index !== -1) productos.value[index] = res.data
      if (producto_seleccionado.value?.id === id) {
        producto_seleccionado.value = res.data
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

  async function eliminarProducto(id: number): Promise<boolean> {
    loading.value.eliminar = true
    error.value            = null
    try {
      await deleteProducto(id)
      productos.value = productos.value.filter(p => p.id !== id)
      if (producto_seleccionado.value?.id === id) {
        producto_seleccionado.value = null
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

  async function toggleActivo(id: number): Promise<Producto | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res   = await toggleActiveProducto(id)
      const index = productos.value.findIndex(p => p.id === id)
      if (index !== -1) productos.value[index] = res.data
      if (producto_seleccionado.value?.id === id) {
        producto_seleccionado.value = res.data
      }
      return res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  
  async function fetchTamanosProducto(productoId: number): Promise<void> {
    loading.value.fetch = true
    error.value         = null
    try {
      const res          = await getProductoTamanos(productoId)
      tamanos_producto.value = res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function agregarTamanoProducto(
    productoId: number,
    payload: ProductoTamanoPayload
  ): Promise<boolean> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await addTamanoToProducto(productoId, payload)
      tamanos_producto.value.push(res.data)
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.guardar = false
    }
  }

  async function eliminarTamanoProducto(productoId: number, tamanoId: number): Promise<boolean> {
    loading.value.eliminar = true
    error.value            = null
    try {
      await removeTamanoFromProducto(productoId, tamanoId)
      tamanos_producto.value = tamanos_producto.value.filter(t => t.tamano_id !== tamanoId)
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.eliminar = false
    }
  }

  
  async function fetchStockBebidas(): Promise<void> {
    loading.value.stock = true
    error.value         = null
    try {
      const res          = await getStockBebidas()
      stock_bebidas.value = res.data.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.stock = false
    }
  }

  async function agregarStock(productoId: number, cantidad: number): Promise<boolean> {
    loading.value.stock = true
    error.value         = null
    try {
      const res   = await addStockToProducto(productoId, cantidad)
      
      const index = stock_bebidas.value.findIndex(b => b.producto_id === productoId)
      if (index !== -1) {
        stock_bebidas.value[index].stock  = res.data.stock_actual
        stock_bebidas.value[index].agotado = res.data.stock_actual === 0
      }
      
      const iProd = productos.value.findIndex(p => p.id === productoId)
      if (iProd !== -1) productos.value[iProd].stock = res.data.stock_actual
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.stock = false
    }
  }

  return {
    
    productos, producto_seleccionado, tamanos_producto, stock_bebidas, loading, error,
    
    totalProductos, pizzas, bebidas, otros, soloActivos, buscarPorNombre, bebidasAgotadas,
    
    fetchProductos, fetchProductosByCategoria, buscarProducto,
    agregarProducto, editarProducto, eliminarProducto, toggleActivo,
    
    fetchTamanosProducto, agregarTamanoProducto, eliminarTamanoProducto,
    
    fetchStockBebidas, agregarStock,
  }
})