import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getFacturas, getFactura,
  createFactura, updateFactura, anularFactura,
  type Factura,
  type CreateFacturaPayload,
  type UpdateFacturaPayload,
} from '@/services/service_factura'
import { getErrorMessage } from '@/utils/errors'

const CACHE_TTL = 5 * 60 * 1000

export const useStoreFacturas = defineStore('facturas', () => {

  
  const facturas             = ref<Factura[]>([])
  const factura_seleccionada = ref<Factura | null>(null)
  const lastFetch            = ref<number | null>(null)
  const loading              = ref({
    fetch:    false,
    guardar:  false,
    anular:   false,
    eliminar: false,
  })
  const error = ref<string | null>(null)

  
  const totalFacturas = computed(() => facturas.value.length)

  const facturasActivas = computed(() =>
    facturas.value.filter(f => !f.anulada)
  )

  const facturasAnuladas = computed(() =>
    facturas.value.filter(f => f.anulada)
  )

  const buscarPorCliente = computed(() => (cliente_id: number) =>
    facturas.value.filter(f => f.cliente_id === cliente_id)
  )

  const buscarPorPedido = computed(() => (pedido_id: number) =>
    facturas.value.find(f => f.pedido_id === pedido_id) ?? null
  )

  
  function cacheEsValido(): boolean {
    return lastFetch.value !== null &&
           (Date.now() - lastFetch.value) < CACHE_TTL &&
           facturas.value.length > 0
  }

  function invalidarCache(): void {
    lastFetch.value = null
  }

  

  
  async function fetchFacturas(force = false): Promise<void> {
    if (!force && (loading.value.fetch || cacheEsValido())) return

    loading.value.fetch = true
    error.value         = null
    try {
      const res         = await getFacturas()
      facturas.value    = res.data.data
      lastFetch.value   = Date.now()
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  
  async function buscarFactura(id: number): Promise<void> {
    const enMemoria = facturas.value.find(f => f.id === id)
    if (enMemoria) {
      factura_seleccionada.value = enMemoria
      return
    }

    loading.value.fetch = true
    error.value         = null
    try {
      const res                  = await getFactura(id)
      factura_seleccionada.value = res.data.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  
  async function crearFactura(payload: CreateFacturaPayload): Promise<Factura | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await createFactura(payload)
      facturas.value.unshift(res.data.data)   
      invalidarCache()
      return res.data.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  
  async function editarFactura(
    id: number,
    payload: UpdateFacturaPayload
  ): Promise<Factura | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res   = await updateFactura(id, payload)
      const index = facturas.value.findIndex(f => f.id === id)
      if (index !== -1) facturas.value[index] = res.data.data   
      if (factura_seleccionada.value?.id === id) {
        factura_seleccionada.value = res.data.data               
      }
      invalidarCache()
      return res.data.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  
  async function anularFacturaAction(id: number): Promise<Factura | null> {
    loading.value.anular = true
    error.value          = null
    try {
      const res   = await anularFactura(id)
      const index = facturas.value.findIndex(f => f.id === id)
      if (index !== -1) facturas.value[index] = res.data.data   
      if (factura_seleccionada.value?.id === id) {
        factura_seleccionada.value = res.data.data
      }
      invalidarCache()
      return res.data.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.anular = false
    }
  }

  return {
    
    facturas,
    factura_seleccionada,
    loading,
    error,
    
    totalFacturas,
    facturasActivas,
    facturasAnuladas,
    buscarPorCliente,
    buscarPorPedido,
    
    fetchFacturas,
    buscarFactura,
    crearFactura,
    editarFactura,
    anularFacturaAction,
  }
})