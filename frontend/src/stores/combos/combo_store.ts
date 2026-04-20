import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getCombos,
  getComboProductos,
  createCombo,
  updateCombo,
  deleteCombo            as deleteComboApi,
  addProductoToCombo,
  updateProductoInCombo,
  removeProductoFromCombo,
  type Combo,
  type ComboProducto,
  type ComboProductoItem,
  type CreateComboPayload,
  type UpdateComboPayload,
  type AddProductoPayload,
} from '@/services/combo_service'
import { useStoreProductos } from '@/stores/productos/productos'
import { getErrorMessage }   from '@/utils/errors'

const CACHE_TTL = 5 * 60 * 1000


function enrichProductos(
  raw:          ComboProducto[],
  productosMap: Map<number, string>
): ComboProductoItem[] {
  return raw.map(p => ({
    producto_id: p.producto_id,
    nombre:      p.producto?.nombre ?? productosMap.get(p.producto_id) ?? `Producto #${p.producto_id}`,
    cantidad:    p.cantidad,
  }))
}


function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj?.data)) return obj.data as T[]
  return []
}


function extractItem<T>(data: unknown): T {
  const obj = data as Record<string, unknown>
  return (obj?.data ?? data) as T
}

export const useStoreCombos = defineStore('combos', () => {

  
  const combos    = ref<Combo[]>([])
  const lastFetch = ref<number | null>(null)
  const loading   = ref({ fetch: false })
  const error     = ref<string | null>(null)

  
  const combosActivos = computed(() =>
    combos.value.filter(c => c.activo)
  )

  
  function cacheEsValido(): boolean {
    return (
      lastFetch.value !== null &&
      Date.now() - lastFetch.value < CACHE_TTL &&
      combos.value.length > 0
    )
  }

  function buildProductosMap(): Map<number, string> {
    try {
      const ps = useStoreProductos()
      return new Map(ps.productos.map(p => [p.id, p.nombre]))
    } catch {
      return new Map()
    }
  }

  function getComboIndex(id: number): number {
    return combos.value.findIndex(c => c.id === id)
  }

  

  
  async function fetchCombos(force = false): Promise<void> {
    if (!force && (loading.value.fetch || cacheEsValido())) return

    loading.value.fetch = true
    error.value         = null

    try {
      const res   = await getCombos()
      const lista = extractArray<Combo>(res.data)

      const productosMap = buildProductosMap()

      const conProductos = await Promise.all(
        lista.map(async (combo) => {
          let raw: ComboProducto[] = combo.combo_productos ?? []

          
          if (raw.length === 0) {
            try {
              const pRes = await getComboProductos(combo.id)
              raw = extractArray<ComboProducto>(pRes.data)
            } catch {
              raw = []
            }
          }

          return {
            ...combo,
            combo_productos: raw,
            productos:       enrichProductos(raw, productosMap),
          }
        })
      )

      combos.value    = conProductos
      lastFetch.value = Date.now()

    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  
  async function agregarCombo(payload: CreateComboPayload): Promise<Combo | null> {
    error.value = null
    try {
      const res   = await createCombo(payload)
      const nuevo = extractItem<Combo>(res.data)

      const comboCompleto: Combo = {
        ...nuevo,
        combo_productos: [],
        productos:       [],
      }

      combos.value.push(comboCompleto)
      return comboCompleto

    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    }
  }

  
  async function actualizarCombo(id: number, payload: UpdateComboPayload): Promise<Combo | null> {
    error.value = null
    try {
      const res         = await updateCombo(id, payload)
      const actualizado = extractItem<Combo>(res.data)
      const idx         = getComboIndex(id)

      if (idx !== -1) {
        combos.value[idx] = {
          ...combos.value[idx],
          ...actualizado,
        }
        return combos.value[idx]
      }
      return null

    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    }
  }

  
  async function eliminarCombo(id: number): Promise<boolean> {
    error.value = null
    try {
      await deleteComboApi(id)
      combos.value = combos.value.filter(c => c.id !== id)
      return true

    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  
  async function agregarProductoACombo(
    comboId: number,
    payload: AddProductoPayload
  ): Promise<boolean> {
    error.value = null
    try {
      const res  = await addProductoToCombo(comboId, payload)
      const item = extractItem<ComboProducto>(res.data)

      const idx = getComboIndex(comboId)
      if (idx !== -1) {
        combos.value[idx].combo_productos.push(item)
        combos.value[idx].productos = enrichProductos(
          combos.value[idx].combo_productos,
          buildProductosMap()
        )
      }
      return true

    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  
  async function actualizarCantidadProducto(
    comboId:    number,
    productoId: number,
    cantidad:   number
  ): Promise<boolean> {
    error.value = null
    try {
      await updateProductoInCombo(comboId, productoId, cantidad)

      const idx = getComboIndex(comboId)
      if (idx !== -1) {
        const pIdx = combos.value[idx].combo_productos
          .findIndex(p => p.producto_id === productoId)

        if (pIdx !== -1) {
          combos.value[idx].combo_productos[pIdx].cantidad = cantidad
          combos.value[idx].productos = enrichProductos(
            combos.value[idx].combo_productos,
            buildProductosMap()
          )
        }
      }
      return true

    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  
  async function quitarProductoDeCombo(
    comboId:    number,
    productoId: number
  ): Promise<boolean> {
    error.value = null
    try {
      await removeProductoFromCombo(comboId, productoId)

      const idx = getComboIndex(comboId)
      if (idx !== -1) {
        combos.value[idx].combo_productos = combos.value[idx].combo_productos
          .filter(p => p.producto_id !== productoId)

        combos.value[idx].productos = enrichProductos(
          combos.value[idx].combo_productos,
          buildProductosMap()
        )
      }
      return true

    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    }
  }

  
  return {
    
    combos,
    loading,
    error,
    
    combosActivos,
    
    fetchCombos,
    agregarCombo,
    actualizarCombo,
    eliminarCombo,
    agregarProductoACombo,
    actualizarCantidadProducto,
    quitarProductoDeCombo,
  }
})