import { defineStore } from "pinia"
import { ref, computed } from "vue"
import {
  getPedidos, getPedido, createPedido, updatePedido, deletePedido,
  cambiarEstadoPedido, addDetallePedido, addExtraDetalle, deleteExtraDetalle,
  addDetalleMitad,
  type Pedido, type PedidoPayload, type DetallePedidoPayload,
  type DetalleExtraPayload, type CambiarEstadoPayload,
  type DetallePedido, type DetalleExtra,
  type DetalleMitadPizzaPayload,
} from "@/services/pedido_service"
import { getErrorMessage } from "@/utils/errors.ts"

const CACHE_TTL = 2 * 60 * 1000

export const TIPO_ENTREGA_LOCAL     = 1
export const TIPO_ENTREGA_DOMICILIO = 2

export const useStorePedidos = defineStore("pedidos", () => {

  
  const pedidos             = ref<Pedido[]>([])
  const pedido_seleccionado = ref<Pedido | null>(null)
  const lastFetch           = ref<number | null>(null)
  const loading             = ref({
    fetch:    false,
    guardar:  false,
    eliminar: false,
    estado:   false,
    detalle:  false,
    extra:    false,
    mitad:    false,   
  })
  const error = ref<string | null>(null)

  
  const totalPedidos = computed(() => pedidos.value.length)

  const pedidosPorEstado = computed(() => (estadoId: number) =>
    pedidos.value.filter(p => p.estado_id === estadoId)
  )

  const pedidosPorTipoEntrega = computed(() => (tipoEntregaId: number) =>
    pedidos.value.filter(p => p.tipo_entrega_id === tipoEntregaId)
  )

  const pedidosPorCliente = computed(() => (clienteId: number) =>
    pedidos.value.filter(p => p.cliente_id === clienteId)
  )

  const pedidosLocales   = computed(() => pedidosPorTipoEntrega.value(TIPO_ENTREGA_LOCAL))
  const pedidosDomicilio = computed(() => pedidosPorTipoEntrega.value(TIPO_ENTREGA_DOMICILIO))

  
  function cacheEsValido(): boolean {
    return lastFetch.value !== null &&
           (Date.now() - lastFetch.value) < CACHE_TTL &&
           pedidos.value.length > 0
  }

  function invalidarCache(): void {
    lastFetch.value = null
  }

  
  async function fetchPedidos(force = false): Promise<void> {
    if (!force && (loading.value.fetch || cacheEsValido())) return
    loading.value.fetch = true
    error.value         = null
    try {
      const res       = await getPedidos()
      pedidos.value   = res.data.data
      lastFetch.value = Date.now()
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function buscarPedido(id: number): Promise<void> {
    const enMemoria = pedidos.value.find(p => p.id === id)
    if (enMemoria) {
      pedido_seleccionado.value = enMemoria
      return
    }
    loading.value.fetch = true
    error.value         = null
    try {
      const res                 = await getPedido(id)
      pedido_seleccionado.value = res.data.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function agregarPedido(payload: PedidoPayload): Promise<Pedido | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await createPedido(payload)
      pedidos.value.push(res.data.data)
      invalidarCache()
      return res.data.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function editarPedido(id: number, payload: Partial<PedidoPayload>): Promise<Pedido | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res   = await updatePedido(id, payload)
      const index = pedidos.value.findIndex(p => p.id === id)
      if (index !== -1) pedidos.value[index] = res.data.data
      if (pedido_seleccionado.value?.id === id) {
        pedido_seleccionado.value = res.data.data
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

  async function eliminarPedido(id: number): Promise<boolean> {
    loading.value.eliminar = true
    error.value            = null
    try {
      await deletePedido(id)
      pedidos.value = pedidos.value.filter(p => p.id !== id)
      if (pedido_seleccionado.value?.id === id) {
        pedido_seleccionado.value = null
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

  async function cambiarEstado(id: number, payload: CambiarEstadoPayload): Promise<Pedido | null> {
    loading.value.estado = true
    error.value          = null
    try {
      const res   = await cambiarEstadoPedido(id, payload)
      const index = pedidos.value.findIndex(p => p.id === id)
      if (index !== -1) pedidos.value[index] = res.data.data
      if (pedido_seleccionado.value?.id === id) {
        pedido_seleccionado.value = res.data.data
      }
      return res.data.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.estado = false
    }
  }

  
  async function agregarDetalle(
    pedidoId: number,
    payload:  DetallePedidoPayload
  ): Promise<DetallePedido | null> {
    loading.value.detalle = true
    error.value           = null
    try {
      const res     = await addDetallePedido(pedidoId, payload)
      const detalle = res.data.data
      _agregarDetalleEnMemoria(pedidoId, detalle)
      return detalle
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.detalle = false
    }
  }

  
  async function agregarDetalleMitad(
    pedidoId: number,
    payload:  DetalleMitadPizzaPayload   
  ): Promise<DetallePedido | null> {
    loading.value.mitad = true
    error.value         = null
    try {
      const res     = await addDetalleMitad(pedidoId, payload)
      const detalle = res.data.data
      _agregarDetalleEnMemoria(pedidoId, detalle)
      return detalle
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.mitad = false
    }
  }

  
  async function agregarExtra(
    pedidoId:  number,
    detalleId: number,
    payload:   DetalleExtraPayload
  ): Promise<DetalleExtra | null> {
    loading.value.extra = true
    error.value         = null
    try {
      const res   = await addExtraDetalle(pedidoId, detalleId, payload)
      const extra = res.data.data
      _actualizarExtraEnMemoria(pedidoId, detalleId, (d) => {
        d.extras.push(extra)
        d.subtotal += extra.precio_extra
      })
      return extra
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.extra = false
    }
  }

  async function eliminarExtra(
    pedidoId:  number,
    detalleId: number,
    extraId:   number
  ): Promise<boolean> {
    loading.value.extra = true
    error.value         = null
    try {
      await deleteExtraDetalle(pedidoId, detalleId, extraId)
      _actualizarExtraEnMemoria(pedidoId, detalleId, (d) => {
        const extra = d.extras.find(e => e.id === extraId)
        if (extra) d.subtotal -= extra.precio_extra
        d.extras = d.extras.filter(e => e.id !== extraId)
      })
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.extra = false
    }
  }

  

  
  function _agregarDetalleEnMemoria(pedidoId: number, detalle: DetallePedido): void {
    const index = pedidos.value.findIndex(p => p.id === pedidoId)
    if (index !== -1) {
      pedidos.value[index].detalles.push(detalle)
      pedidos.value[index].total += detalle.subtotal
    }
    if (pedido_seleccionado.value?.id === pedidoId) {
      pedido_seleccionado.value.detalles.push(detalle)
      pedido_seleccionado.value.total += detalle.subtotal
    }
  }

  
  function _actualizarExtraEnMemoria(
    pedidoId:  number,
    detalleId: number,
    mutacion:  (d: DetallePedido) => void
  ): void {
    const aplicar = (pedido: Pedido) => {
      const detalle = pedido.detalles.find(d => d.id === detalleId)
      if (detalle) {
        const subtotalAntes = detalle.subtotal
        mutacion(detalle)
        pedido.total += detalle.subtotal - subtotalAntes
      }
    }
    const index = pedidos.value.findIndex(p => p.id === pedidoId)
    if (index !== -1) aplicar(pedidos.value[index])
    if (pedido_seleccionado.value?.id === pedidoId) aplicar(pedido_seleccionado.value)
  }

  return {
    
    pedidos, pedido_seleccionado, loading, error,
    
    totalPedidos, pedidosPorEstado, pedidosPorTipoEntrega,
    pedidosPorCliente, pedidosLocales, pedidosDomicilio,
    
    fetchPedidos, buscarPedido, agregarPedido,
    editarPedido, eliminarPedido, cambiarEstado,
    
    agregarDetalle,
    agregarDetalleMitad,   
    
    agregarExtra, eliminarExtra,
  }
})