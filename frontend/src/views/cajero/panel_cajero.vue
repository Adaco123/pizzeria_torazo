<template>
  <div class="container">
    <CajeroHeader
      :nombre="nombre"
      :rol="rol"
      :turno-activo="turnoActivo"
      :loading="turnosStore.loading.guardar || turnosStore.loading.cerrar"
      @toggle-turno="toggleTurno"
      @logout="logout"
    />

    <div class="pos-panel">
      <div class="pos-header">
        <h2><i class="fas fa-cash-register"></i> PUNTO DE VENTA</h2>
        <div class="date-time">{{ currentDateTime }}</div>
      </div>

      <div class="pos-content">

        <ProductosPanel
          :productos="productos"
          :bebidas="bebidas"
          :combos-activos="combosStore.combosActivos"
          :turno-activo="turnoActivo"
          @add-producto="handleClickProducto"
          @add-combo="agregarComboAlCarrito"
          @open-mitad="showMitadModal = true"
          @open-stock="abrirModalStock"
        />

        <CarritoPanel
          :cart="cart"
          :productos="productos"
          v-model:clienteSeleccionado="clienteSeleccionado"
          v-model:descuentoPct="descuentoPct"
          :cargando="cargandoVenta"
          :error-venta="errorVenta"
          @pagar="procesarPago"
          @limpiar="handleLimpiarCarrito"
          @update-cantidad="handleCambiarCantidad"
          @remove-item="(i) => cart.splice(i, 1)"
        />

      </div>
    </div>

    <ModalTurno
      :show="showInicioTurnoModal || showCierreTurnoModal"
      :mode="showCierreTurnoModal ? 'cierre' : 'inicio'"
      :nombre="nombre"
      :rol="rol"
      :turno-id="turnoActualId"
      :loading="turnosStore.loading.guardar || turnosStore.loading.cerrar"
      :error="errorModalTurno"
      @close="cerrarModalTurno"
      @confirm="onConfirmTurno"
    />

    <PizzaCustomizerModal
      :show="showPizzaModal"
      :pizza="pizzaSeleccionada"
      @close="showPizzaModal = false; pizzaSeleccionada = null"
      @add-to-cart="onAddPizzaToCart"
    />

    <PizzaMitadModal
      :show="showMitadModal"
      @close="showMitadModal = false"
      @add-to-cart="onAddMitadToCart"
    />

    <BebidasStockModal
      :show="showStockModal"
      :bebida="bebidaParaStock"
      @close="showStockModal = false; bebidaParaStock = null"
      @stock-updated="bebidasStore.fetchBebidas()"
    />

    <ModalEfectivo
      :show="showEfectivoModal"
      :total="totalConIva"
      :cliente-nombre="clienteSeleccionado?.nombre ?? ''"
      :cargando="cargandoVenta"
      :error="errorVenta"
      @close="showEfectivoModal = false"
      @confirm="confirmarEfectivo"
    />

    <ModalConfirmacion
      :show="showConfirmModal"
      :factura="facturaGenerada"
      :mensaje="mensajeConfirmacion"
      :metodo="metodoUsado"
      :cambio="cambioEntregado"
      :cliente-nombre="clienteNombreGuardado"
      :descuento-pct="descuentoPctGuardado"
      :pedido-id="pedidoIdParaTicket"
      :imprimiendo="imprimiendoTicket"
      :error-ticket="errorTicket"
      @cerrar="cerrarConfirmacion"
      @imprimir="handleImprimirTicket"
    />

    <ResumenTurnoPDF
      :show="showResumenModal"
      :turno-id="turnoIdParaResumen"
      @close="showResumenModal = false; turnoIdParaResumen = null"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs }           from 'pinia'
import { useRouter }             from 'vue-router'
import { useAuthStore }          from '@/stores/auth'
import { useStoreProductos }     from '@/stores/productos/productos'
import { useBebidasStore }       from '@/stores/productos/bebidas'
import { useStorePedidos }       from '@/stores/pedidos/pedido_store'
import { useStoreTurnos }        from '@/stores/turnos/store_turno'
import { useStoreFacturas }      from '@/stores/facturas/factura_store'
import { useStoreCombos }        from '@/stores/combos/combo_store'
import { usePagoStore }          from '@/stores/pagos/pago_store'           // ← NUEVO
import type { PagoPayload }      from '@/services/pago_service'       // ← NUEVO
import type { Producto }         from '@/services/producto_service'
import type { Combo }            from '@/services/combo_service'
import type { Factura }          from '@/services/service_factura'
import { imprimirTicket }        from '@/services/ticket_service'

import CajeroHeader         from '@/components/panel_cajero/CajeroHeader.vue'
import ProductosPanel       from '@/components/panel_cajero/ProductosPanel.vue'
import CarritoPanel         from '@/components/panel_cajero/CarritoPanel.vue'
import ModalTurno           from '@/components/panel_cajero/ModalTurno.vue'
import ModalEfectivo        from '@/components/panel_cajero/ModalEfectivo.vue'
import ModalConfirmacion    from '@/components/panel_cajero/ModalConfirmacion.vue'
import PizzaCustomizerModal from '@/components/panel_cajero/PizzaCustomizerModal.vue'
import PizzaMitadModal      from '@/components/panel_cajero/PizzaMitadModal.vue'
import BebidasStockModal    from '@/components/panel_cajero/add_bebida.vue'
import ResumenTurnoPDF      from '@/components/panel_cajero/ResumenTurnoPDF.vue'

interface ExtraItem {
  ingrediente_id: number
  nombre:         string
  precio_extra:   number
  cantidad:       number
  tamano_id:      number | null
}

interface MitadCarrito {
  mitad:       1 | 2
  producto_id: number
  extras:      { ingrediente_id: number; cantidad: number }[]
}

interface ComboItemCarrito {
  producto_id: number
  nombre:      string
  cantidad:    number
}

interface CartItem {
  carrito_item_id:   string
  type:              'pizza' | 'bebida' | 'otro' | 'mitad' | 'combo'
  producto_id:       number
  combo_id?:         number
  combo_items?:      ComboItemCarrito[]
  nombre:            string
  tamano_id:         number | null
  tamano_nombre:     string | null
  precio_unitario:   number
  cantidad:          number
  subtotal:          number
  extras:            ExtraItem[]
  instrucciones:     string
  direccion_entrega: string
  mitades?:          MitadCarrito[]
}

const authStore      = useAuthStore()
authStore.init()
const router         = useRouter()
const nombre         = computed(() => authStore.user?.nombre)
const rol            = computed(() => authStore.user?.rol)
const logout         = () => { authStore.logout(); router.push('/login') }

const productosStore = useStoreProductos()
const bebidasStore   = useBebidasStore()
const pedidosStore   = useStorePedidos()
const turnosStore    = useStoreTurnos()
const facturasStore  = useStoreFacturas()
const combosStore    = useStoreCombos()
const pagoStore      = usePagoStore()   // ← NUEVO

const { productos } = storeToRefs(productosStore)
const { bebidas }   = storeToRefs(bebidasStore)

const turnoActivo          = ref(false)
const turnoActualId        = ref<number | null>(null)
const showInicioTurnoModal = ref(false)
const showCierreTurnoModal = ref(false)
const errorModalTurno      = ref('')
const showResumenModal     = ref(false)
const turnoIdParaResumen   = ref<number | null>(null)

const toggleTurno = () => {
  errorModalTurno.value = ''
  if (!turnoActivo.value) {
    showInicioTurnoModal.value = true
  } else {
    if (cart.value.length > 0) {
      alert('No puedes cerrar el turno con productos en el carrito')
      return
    }
    showCierreTurnoModal.value = true
  }
}

const cerrarModalTurno = () => {
  showInicioTurnoModal.value = false
  showCierreTurnoModal.value = false
  errorModalTurno.value      = ''
}

const onConfirmTurno = async (monto: number) => {
  errorModalTurno.value = ''

  if (monto === null || monto === undefined) {
    errorModalTurno.value = 'Debes ingresar un monto'; return
  }
  if (monto < 0) {
    errorModalTurno.value = 'El monto no puede ser negativo'; return
  }

  if (showInicioTurnoModal.value) {
    const turno = await turnosStore.abrirTurno(authStore.user!.id, monto)
    if (!turno) { errorModalTurno.value = turnosStore.error ?? 'Error al iniciar turno'; return }
    turnoActivo.value          = true
    turnoActualId.value        = turno.id
    showInicioTurnoModal.value = false
    alert(`Turno #${turno.id} iniciado con monto inicial Bs ${turno.monto_inicio.toFixed(2)}`)
  } else {
    if (!turnoActualId.value) { errorModalTurno.value = 'No hay turno activo'; return }
    const turno = await turnosStore.cerrarTurnoAction(turnoActualId.value, monto)
    if (!turno) { errorModalTurno.value = turnosStore.error ?? 'Error al cerrar turno'; return }
    turnoIdParaResumen.value   = turnoActualId.value
    turnoActivo.value          = false
    turnoActualId.value        = null
    showCierreTurnoModal.value = false
    showResumenModal.value     = true
  }
}

const cart                = ref<CartItem[]>([])
const descuentoPct        = ref<number>(0)
const clienteSeleccionado = ref<any>(null)

const subtotal        = computed(() => cart.value.reduce((s, i) => s + i.subtotal, 0))
const descuentoMonto  = computed(() => subtotal.value * (descuentoPct.value / 100))
const subtotalConDesc = computed(() => subtotal.value - descuentoMonto.value)
const iva             = computed(() => subtotalConDesc.value * 0.16)
const totalConIva     = computed(() => subtotalConDesc.value + iva.value)

const construirItem = (
  type: CartItem['type'],
  producto: Producto,
  extras: ExtraItem[] = [],
  tamano_id: number | null = null,
  tamano_nombre: string | null = null,
  precio_unitario?: number,
  cantidad = 1,
  instrucciones = ''
): CartItem => {
  const pu     = precio_unitario ?? producto.precio_base
  const extSum = extras.reduce((s, e) => s + e.precio_extra * e.cantidad, 0)
  return {
    carrito_item_id:   `${Date.now()}-${Math.random()}`,
    type,
    producto_id:       producto.id,
    nombre:            producto.nombre,
    tamano_id,
    tamano_nombre,
    precio_unitario:   pu,
    cantidad,
    subtotal:          (pu + extSum) * cantidad,
    extras,
    instrucciones,
    direccion_entrega: '',
  }
}

const recalcularSubtotal = (item: CartItem): number => {
  if (item.type === 'combo') return item.precio_unitario * item.cantidad
  const extSum = item.extras.reduce((s, e) => s + e.precio_extra * e.cantidad, 0)
  return (item.precio_unitario + extSum) * item.cantidad
}

const handleLimpiarCarrito = () => {
  if (cart.value.length && confirm('¿Vaciar el carrito?')) {
    cart.value         = []
    descuentoPct.value = 0
  }
}

const getBebidaInfo = (productoId: number) =>
  bebidas.value.find(b => b.producto_id === productoId)

const ID_CAT_PIZZAS  = 1
const ID_CAT_BEBIDAS = 2

const handleClickProducto = (producto: Producto) => {
  if (!turnoActivo.value) { alert('Debes iniciar turno primero'); return }
  if (producto.categoria_id === ID_CAT_PIZZAS)  return abrirModalPizza(producto)
  if (producto.categoria_id === ID_CAT_BEBIDAS) return agregarBebidaAlCarrito(producto)
  agregarSimpleAlCarrito(producto)
}

const agregarBebidaAlCarrito = (producto: Producto) => {
  const bebida = getBebidaInfo(producto.id)
  if (!bebida || bebida.agotado || bebida.stock <= 0) { alert('Producto agotado'); return }
  const enCarrito = cart.value
    .filter(i => i.producto_id === producto.id)
    .reduce((acc, i) => acc + i.cantidad, 0)
  if (enCarrito + 1 > bebida.stock) { alert(`Solo hay ${bebida.stock} unidades disponibles`); return }
  const existente = cart.value.find(i => i.producto_id === producto.id && i.type === 'bebida')
  if (existente) { existente.cantidad++; existente.subtotal = recalcularSubtotal(existente) }
  else cart.value.push(construirItem('bebida', producto))
}

const agregarSimpleAlCarrito = (producto: Producto) => {
  const existente = cart.value.find(i => i.producto_id === producto.id && i.type === 'otro')
  if (existente) { existente.cantidad++; existente.subtotal = recalcularSubtotal(existente) }
  else cart.value.push(construirItem('otro', producto))
}

const agregarComboAlCarrito = (combo: Combo) => {
  if (!turnoActivo.value) { alert('Debes iniciar turno primero'); return }
  const existente = cart.value.find(i => i.type === 'combo' && i.combo_id === combo.id)
  if (existente) {
    existente.cantidad++
    existente.subtotal = existente.precio_unitario * existente.cantidad
    return
  }
  cart.value.push({
    carrito_item_id:   `${Date.now()}-${Math.random()}`,
    type:              'combo',
    producto_id:       0,
    combo_id:          combo.id,
    combo_items:       combo.combo_productos.map(cp => ({
      producto_id: cp.producto_id,
      nombre:      cp.producto?.nombre ?? `Producto #${cp.producto_id}`,
      cantidad:    cp.cantidad,
    })),
    nombre:            combo.nombre,
    tamano_id:         null,
    tamano_nombre:     null,
    precio_unitario:   combo.precio,
    cantidad:          1,
    subtotal:          combo.precio,
    extras:            [],
    instrucciones:     '',
    direccion_entrega: '',
  })
}

const handleCambiarCantidad = (index: number, delta: number, item: CartItem) => {
  const nueva = item.cantidad + delta
  if (nueva <= 0) { cart.value.splice(index, 1); return }
  if (item.type === 'bebida' && delta > 0) {
    const bebida = getBebidaInfo(item.producto_id)
    if (bebida && nueva > bebida.stock) { alert(`Solo hay ${bebida.stock} unidades disponibles`); return }
  }
  item.cantidad = nueva
  item.subtotal = item.type === 'mitad'
    ? item.precio_unitario * nueva
    : recalcularSubtotal(item)
}

const showPizzaModal    = ref(false)
const pizzaSeleccionada = ref<Producto | null>(null)

const abrirModalPizza = (p: Producto) => { pizzaSeleccionada.value = p; showPizzaModal.value = true }

const onAddPizzaToCart = (item: any) => {
  if (!pizzaSeleccionada.value) return
  cart.value.push(construirItem(
    'pizza',
    pizzaSeleccionada.value,
    item.extras,
    item.tamano_id           ?? null,
    item.size                ?? null,
    item.unitPrice,
    item.quantity,
    item.specialInstructions ?? '',
  ))
}

const showMitadModal = ref(false)

const onAddMitadToCart = (item: any) => {
  cart.value.push({
    carrito_item_id:   `${Date.now()}-${Math.random()}`,
    type:              'mitad',
    producto_id:       0,
    nombre:            item.nombre,
    tamano_id:         item.tamano_id,
    tamano_nombre:     item.tamano_nombre,
    precio_unitario:   item.precio_unitario,
    cantidad:          item.cantidad,
    subtotal:          item.subtotal,
    extras:            [],
    instrucciones:     item.instrucciones ?? '',
    direccion_entrega: '',
    mitades:           item.mitades,
  })
}

const showStockModal  = ref(false)
const bebidaParaStock = ref<any>(null)

const abrirModalStock = (producto: Producto) => {
  bebidaParaStock.value = getBebidaInfo(producto.id) ?? {
    producto_id: producto.id, nombre: producto.nombre, stock: 0, agotado: true,
  }
  showStockModal.value = true
}

const showEfectivoModal      = ref(false)
const showConfirmModal       = ref(false)
const mensajeConfirmacion    = ref('')
const facturaGenerada        = ref<Factura | null>(null)
const metodoUsado            = ref<'efectivo' | 'qr'>('efectivo')
const cargandoVenta          = ref(false)
const errorVenta             = ref<string | null>(null)
const cambioEntregado        = ref(0)
const clienteNombreGuardado  = ref('')
const descuentoPctGuardado   = ref(0)
const pedidoIdParaTicket     = ref<number | null>(null)
const imprimiendoTicket      = ref(false)
const errorTicket            = ref<string | null>(null)

const montoRecibidoEfectivo  = ref<number | null>(null)

const procesarPago = (metodo: 'efectivo' | 'qr') => {
  if (!turnoActivo.value)         { alert('Debes iniciar turno primero');  return }
  if (!clienteSeleccionado.value) { alert('Debes seleccionar un cliente'); return }
  if (!cart.value.length)         { alert('Agrega productos al carrito');  return }
  if (descuentoPct.value < 0 || descuentoPct.value > 100) {
    alert('El descuento debe estar entre 0% y 100%'); return
  }
  errorVenta.value  = null
  metodoUsado.value = metodo
  if (metodo === 'efectivo') {
    showEfectivoModal.value = true
  } else {
    finalizarVenta('qr')
  }
}

const confirmarEfectivo = (montoRecibido: number) => {
  cambioEntregado.value      = Math.max(0, montoRecibido - totalConIva.value)
  montoRecibidoEfectivo.value = montoRecibido   // ← NUEVO
  showEfectivoModal.value    = false
  finalizarVenta('efectivo')
}

const _fallbackNumeroFactura = (): string => {
  const d = new Date()
  return `FAC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`
}

const finalizarVenta = async (metodo: 'efectivo' | 'qr') => {
  if (!turnoActualId.value) { alert('No hay turno activo.'); return }

  cargandoVenta.value         = true
  errorVenta.value            = null
  clienteNombreGuardado.value = clienteSeleccionado.value?.nombre ?? ''

  const subtotalBruto = subtotal.value
  const descuentoBs   = descuentoMonto.value
  const ivaLocal      = iva.value
  const totalLocal    = totalConIva.value
  const pctGuardado   = descuentoPct.value

  try {
    const pedido = await pedidosStore.agregarPedido({
      cliente_id:      clienteSeleccionado.value.id,
      usuario_id:      authStore.user!.id,
      turno_id:        turnoActualId.value,
      tipo_entrega_id: 1,
    })
    if (!pedido) {
      errorVenta.value = pedidosStore.error ?? 'Error al crear el pedido'
      return
    }
    pedidoIdParaTicket.value = pedido.id
    for (const item of cart.value) {
      if (item.type === 'combo') {
        await pedidosStore.agregarDetalle(pedido.id, {
          combo_id:        item.combo_id,
          cantidad:        item.cantidad,
          precio_unitario: item.precio_unitario,
        })
      } else if (item.type === 'mitad') {
        await pedidosStore.agregarDetalleMitad(pedido.id, {
          tamano_id: item.tamano_id!,
          cantidad:  item.cantidad,
          notas:     item.instrucciones || undefined,
          mitades:   item.mitades as any,
        })
      } else {
        const detalle = await pedidosStore.agregarDetalle(pedido.id, {
          producto_id:     item.producto_id,
          tamano_id:       item.tamano_id ?? undefined,
          cantidad:        item.cantidad,
          precio_unitario: item.precio_unitario,
          notas:           item.instrucciones || undefined,
        })
        if (!detalle) continue
        for (const extra of item.extras) {
          await pedidosStore.agregarExtra(pedido.id, detalle.id, {
            ingrediente_id: extra.ingrediente_id,
            cantidad:       extra.cantidad,
          })
        }
      }
    }

    const factura = await facturasStore.crearFactura({
      numero_factura: _fallbackNumeroFactura(),
      pedido_id:      pedido.id,
      cliente_id:     clienteSeleccionado.value.id,
      usuario_id:     authStore.user!.id,
      subtotal:       subtotalBruto,
      descuento:      descuentoBs,
      impuesto:       ivaLocal,
    })
    if (!factura) {
      errorVenta.value = facturasStore.error ?? 'Pedido guardado pero falló la factura.'
      return
    }

    const metodoNombre = metodo === 'efectivo' ? 'efectivo' : 'qr'
    const metodoObj    = pagoStore.metodos.find(
      m => m.nombre.toLowerCase() === metodoNombre,
    )

    if (!metodoObj) {
      await pagoStore.fetchMetodos()
      const metodoReintentar = pagoStore.metodos.find(
        m => m.nombre.toLowerCase() === metodoNombre,
      )
      if (!metodoReintentar) {
        errorVenta.value = `Factura creada pero no se encontró el método de pago '${metodoNombre}'. Regístralo en Configuración.`
        return
      }
    }

    const metodoFinal = pagoStore.metodos.find(
      m => m.nombre.toLowerCase() === metodoNombre,
    )!

    const pagoPayload: PagoPayload = {
      factura_id: factura.id,
      metodo_id:  metodoFinal.id,
      monto:      totalLocal,
      usuario_id: authStore.user!.id,
      // solo se manda para efectivo
      ...(metodo === 'efectivo' && montoRecibidoEfectivo.value !== null
        ? { monto_recibido: montoRecibidoEfectivo.value }
        : {}),
    }

    const pago = await pagoStore.registrarPago(pagoPayload)
    if (!pago) {
      
      errorVenta.value = pagoStore.error ?? 'Factura creada pero falló el registro del pago.'
      
    }

    montoRecibidoEfectivo.value = null  

    descuentoPctGuardado.value = pctGuardado
    facturaGenerada.value      = factura
    mensajeConfirmacion.value  = metodo === 'efectivo'
      ? `Pago en efectivo. Cambio: Bs ${cambioEntregado.value.toFixed(2)}`
      : `Pago con QR por Bs ${totalLocal.toFixed(2)} procesado.`

    cart.value                = []
    clienteSeleccionado.value = null
    descuentoPct.value        = 0
    showConfirmModal.value    = true

  } finally {
    cargandoVenta.value = false
  }
}

const cerrarConfirmacion = () => {
  showConfirmModal.value      = false
  facturaGenerada.value       = null
  mensajeConfirmacion.value   = ''
  cambioEntregado.value       = 0
  clienteNombreGuardado.value = ''
  pedidoIdParaTicket.value    = null
  errorTicket.value           = null
  descuentoPctGuardado.value  = 0
}

const handleImprimirTicket = async () => {
  if (!pedidoIdParaTicket.value) return
  imprimiendoTicket.value = true
  errorTicket.value       = null
  try {
    await imprimirTicket(pedidoIdParaTicket.value)
  } catch (e: any) {
    errorTicket.value = e?.message ?? 'Error al generar el ticket'
  } finally {
    imprimiendoTicket.value = false
  }
}

const currentDateTime = ref('')
let intervalo: number

const actualizarFecha = () => {
  currentDateTime.value = new Date().toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

onMounted(async () => {
  actualizarFecha()
  intervalo = setInterval(actualizarFecha, 1000)

  productosStore.fetchProductos()
  bebidasStore.fetchBebidas()
  combosStore.fetchCombos()
  pagoStore.fetchMetodos()   // ← NUEVO: precarga métodos al iniciar

  if (authStore.user?.id) {
    const turno = await turnosStore.restaurarTurno(authStore.user.id)
    if (turno) { turnoActivo.value = true; turnoActualId.value = turno.id }
  }
})

onUnmounted(() => clearInterval(intervalo))
</script>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }

.container {
  width: 100%; max-width: 1600px;
  padding: 20px; margin: 0 auto;
  position: relative; z-index: 2;
}

.pos-panel {
  background: #ffffff; border-radius: 20px;
  box-shadow: 0 20px 40px rgba(255,0,0,0.2);
  border: 1px solid #ff0000; overflow: hidden; margin-bottom: 30px;
}

.pos-header {
  background: #000000; padding: 15px 25px;
  border-bottom: 3px solid #ff0000;
  display: flex; justify-content: space-between;
  align-items: center; flex-wrap: wrap; gap: 15px;
}
.pos-header h2 {
  color: #ffffff; font-size: 24px; font-weight: 700;
  text-transform: uppercase; display: flex; align-items: center; gap: 10px;
}
.pos-header h2 i { color: #ff0000; }
.date-time { color: #cccccc; font-size: 14px; font-weight: 500; }

.pos-content {
  display: grid; grid-template-columns: 1.5fr 1fr;
  gap: 20px; padding: 25px; background: #f5f5f5;
}

@media (max-width: 1200px) { .pos-content { grid-template-columns: 1fr; } }
</style>