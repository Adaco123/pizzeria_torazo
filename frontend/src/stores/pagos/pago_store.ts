import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getMetodosPago,
  getPagosByFactura,
  crearPago,
  eliminarPago,
  type MetodoPago,
  type Pago,
  type PagoPayload,
} from '@/services/pago_service'

export const usePagoStore = defineStore('pago', () => {
  const metodos   = ref<MetodoPago[]>([])
  const pagos     = ref<Pago[]>([])
  const loading   = ref(false)
  const error     = ref<string | null>(null)

  async function fetchMetodos() {
    try {
      metodos.value = await getMetodosPago()
    } catch (e: any) {
      error.value = e.message
    }
  }

  async function fetchPagos(facturaId: number) {
    loading.value = true
    error.value   = null
    try {
      pagos.value = await getPagosByFactura(facturaId)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function registrarPago(payload: PagoPayload): Promise<Pago | null> {
    loading.value = true
    error.value   = null
    try {
      const nuevo = await crearPago(payload)
      pagos.value.push(nuevo)
      return nuevo
    } catch (e: any) {
      error.value = e.response?.data?.error ?? e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function borrarPago(pagoId: number) {
    loading.value = true
    error.value   = null
    try {
      await eliminarPago(pagoId)
      pagos.value = pagos.value.filter(p => p.id !== pagoId)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const totalPagado = () => pagos.value.reduce((acc, p) => acc + p.monto, 0)

  const vueltoEfectivo = () => {
    const pEfectivo = pagos.value.find(p => p.metodo.nombre.toLowerCase() === 'efectivo')
    return pEfectivo ? pEfectivo.vuelto : 0
  }

  return {
    metodos, pagos, loading, error,
    fetchMetodos, fetchPagos, registrarPago, borrarPago,
    totalPagado, vueltoEfectivo,
  }
})