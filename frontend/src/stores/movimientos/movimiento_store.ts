import { defineStore } from 'pinia'
import { ref }         from 'vue'
import { movimientoStockService, type MovimientoStock, type AgregarStockPayload } from '@/services/movimiento_stock_service'
 
export const useMovimientosStockStore = defineStore('movimientosStock', () => {
 
  
  const movimientos  = ref<MovimientoStock[]>([])
  const loading      = ref(false)
  const error        = ref<string | null>(null)
 
  
 
  
  async function agregarStock(payload: AgregarStockPayload): Promise<MovimientoStock | null> {
    loading.value = true
    error.value   = null
    try {
      const mov = await movimientoStockService.agregarStock(payload)
      
      movimientos.value.unshift(mov)
      return mov
    } catch (e: any) {
      error.value = e?.response?.data?.message || 'Error al añadir stock'
      return null
    } finally {
      loading.value = false
    }
  }
 
  
  async function fetchMovimientosPorProducto(
    productoId: number,
    limit = 10
  ): Promise<void> {
    loading.value = true
    error.value   = null
    try {
      movimientos.value = await movimientoStockService.getMovimientosPorProducto(productoId, limit)
    } catch (e: any) {
      error.value = e?.response?.data?.message || 'Error al cargar historial'
    } finally {
      loading.value = false
    }
  }
 
  
  async function fetchTodos(limit = 20): Promise<void> {
    loading.value = true
    error.value   = null
    try {
      movimientos.value = await movimientoStockService.getTodos({ limit })
    } catch (e: any) {
      error.value = e?.response?.data?.message || 'Error al cargar movimientos'
    } finally {
      loading.value = false
    }
  }
 
  
  function limpiarMovimientos() {
    movimientos.value = []
    error.value       = null
  }
 
  return {
    movimientos,
    loading,
    error,
    agregarStock,
    fetchMovimientosPorProducto,
    fetchTodos,
    limpiarMovimientos,
  }
})