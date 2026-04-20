<template>
  <div class="pizzero-view">
    
    <div class="header">
      <div class="logo-area">
        <div class="logo"><span>EL</span> TORAZO</div>
        <div class="user-info">
          <i class="fas fa-user-circle"></i>
          <div class="user-details">
            <div class="user-name">{{ authStore.user?.nombre }}</div>
            <div class="user-role">PIZZERO</div>
          </div>
        </div>
      </div>
      <button class="logout-btn" @click="logout">
        <i class="fas fa-sign-out-alt"></i> CERRAR SESIÓN
      </button>
    </div>

    
    <div class="pos-panel">
      <div class="pos-header">
        <h2><i class="fas fa-pizza-slice"></i> PANEL PIZZERO</h2>
        <div class="header-stats">
          <div class="stat-item">
            <i class="fas fa-hourglass-half"></i>
            <span class="stat-value">{{ totalPendientes }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-check-circle"></i>
            <span class="stat-value">{{ totalListos }}</span>
            <span class="stat-label">Listos</span>
          </div>
          <div class="stat-item turno-badge" v-if="turnoActivo">
            <i class="fas fa-clock"></i>
            <span class="stat-value">#{{ turnoActivo.id }}</span>
            <span class="stat-label">Turno actual</span>
          </div>
          <div class="stat-item turno-badge sin-turno" v-else>
            <i class="fas fa-exclamation-triangle"></i>
            <span class="stat-label">Sin turno activo</span>
          </div>
        </div>
        <div class="date-time">{{ currentDateTime }}</div>
      </div>

      
      <div class="sin-turno-state" v-if="!turnoActivo">
        <i class="fas fa-exclamation-triangle"></i>
        <p>No hay turno activo. Por favor, abre un turno para ver los pedidos.</p>
      </div>

      <div class="pos-content" v-else>

        
        <div class="filters-row">
          <div class="category-tabs">
            <button
              class="category-tab"
              :class="{ active: filtroActual === 'todos' }"
              @click="filtroActual = 'todos'"
            >TODOS</button>
            <button
              class="category-tab"
              :class="{ active: filtroActual === 'pendiente' }"
              @click="filtroActual = 'pendiente'"
            >PENDIENTES</button>
            <button
              class="category-tab"
              :class="{ active: filtroActual === 'listo' }"
              @click="filtroActual = 'listo'"
            >LISTOS</button>
          </div>
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input
              type="text"
              v-model="busqueda"
              placeholder="Buscar por N° pedido o producto..."
            />
          </div>
          <button class="refresh-btn" @click="cargarDatos" :disabled="pedidosStore.loading.fetch">
            <i class="fas" :class="pedidosStore.loading.fetch ? 'fa-spinner fa-spin' : 'fa-sync-alt'"></i>
          </button>
          <span class="product-count">{{ itemsFiltrados.length }} items</span>
        </div>

        
        <div class="loading-state" v-if="pedidosStore.loading.fetch && itemsFiltrados.length === 0">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Cargando pedidos...</p>
        </div>

        
        <div class="pedidos-grid" v-else-if="itemsFiltrados.length > 0">
          <div
            v-for="item in itemsFiltrados"
            :key="`${item.pedidoId}-${item.detalleId}`"
            class="pedido-card"
            :class="{
              'estado-pendiente': item.estadoPedido !== 'listo',
              'estado-listo':     item.estadoPedido === 'listo',
            }"
          >
            
            <div class="card-header">
              <div class="pedido-meta">
                <span class="pedido-num">
                  <i class="fas fa-hashtag"></i> Pedido {{ item.numeroPedido }}
                </span>
                <span class="hora-info">
                  <i class="far fa-clock"></i> {{ item.hora }}
                </span>
              </div>
              <div class="estado-badge">
                <i :class="item.estadoPedido === 'listo' ? 'fas fa-check-circle' : 'fas fa-hourglass-half'"></i>
                {{ estadoLabel(item.estadoPedido) }}
              </div>
            </div>

            
            <div class="card-body">

              
              <div class="pizza-header">
                <h3 class="pizza-nombre">{{ item.nombre }}</h3>
                <span class="cantidad-badge">x{{ item.cantidad }}</span>
              </div>

              
              <div class="tamano-info" v-if="item.tamano">
                <i class="fas fa-ruler-combined"></i>
                <span>{{ item.tamano }}</span>
              </div>

              
              <div class="extras-lista" v-if="item.extras.length">
                <div class="extras-titulo">
                  <i class="fas fa-plus-circle"></i> EXTRAS
                </div>
                <div
                  v-for="extra in item.extras"
                  :key="extra.ingrediente_id"
                  class="extra-chip"
                >
                  + {{ extra.nombre }} <span v-if="extra.cantidad > 1">x{{ extra.cantidad }}</span>
                </div>
              </div>

              
              <div class="mitades-lista" v-if="item.mitades.length">
                <div
                  v-for="mitad in item.mitades"
                  :key="mitad.mitad"
                  class="mitad-bloque"
                >
                  <div class="mitad-titulo">
                    <i class="fas fa-adjust"></i>
                    Mitad {{ mitad.mitad }}: <strong>{{ mitad.nombre }}</strong>
                  </div>
                  <div
                    v-for="extra in mitad.extras"
                    :key="extra.ingrediente_id"
                    class="extra-chip"
                  >
                    + {{ extra.nombre }} <span v-if="extra.cantidad > 1">x{{ extra.cantidad }}</span>
                  </div>
                </div>
              </div>

              
              <div class="combo-lista" v-if="item.esCombo && item.comboProductos.length">
                <div class="extras-titulo">
                  <i class="fas fa-box-open"></i> PRODUCTOS DEL COMBO
                </div>
                <div
                  v-for="cp in item.comboProductos"
                  :key="cp.nombre"
                  class="combo-prod-chip"
                >
                  ▸ {{ cp.nombre }}
                  <span v-if="cp.cantidad > 1"> x{{ cp.cantidad }}</span>
                  <span v-if="cp.tamano" class="combo-tamano"> — {{ cp.tamano }}</span>
                </div>
              </div>

              
              <div class="notas-especiales" v-if="item.notas">
                <i class="fas fa-comment-alt"></i>
                <span>{{ item.notas }}</span>
              </div>

            </div>

            
            <div class="card-footer">
              <button
                v-if="item.estadoPedido !== 'listo'"
                class="action-btn listo-btn"
                :disabled="cambiandoEstado === item.pedidoId"
                @click="marcarListo(item.pedidoId)"
              >
                <i class="fas" :class="cambiandoEstado === item.pedidoId ? 'fa-spinner fa-spin' : 'fa-check'"></i>
                {{ cambiandoEstado === item.pedidoId ? 'PROCESANDO...' : 'MARCAR PEDIDO LISTO' }}
              </button>
              <div v-else class="listo-label">
                <i class="fas fa-check-circle"></i> LISTO PARA ENTREGAR
              </div>
            </div>

          </div>
        </div>

        
        <div class="empty-state" v-else>
          <i class="fas fa-pizza-slice"></i>
          <p>No hay pedidos para mostrar en este turno</p>
        </div>

      </div>
    </div>

    
    <transition name="toast-slide">
      <div class="toast-notification" v-if="toast.show">
        <i class="fas fa-check-circle"></i>
        <span>{{ toast.message }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter }        from 'vue-router'
import { useAuthStore }     from '@/stores/auth'
import { useStorePedidos }  from '@/stores/pedidos/pedido_store'
import { useStoreTurnos }   from '@/stores/turnos/store_turno'

const router        = useRouter()
const authStore     = useAuthStore()
const pedidosStore  = useStorePedidos()
const turnosStore   = useStoreTurnos()



interface ExtraItem {
  ingrediente_id: number
  nombre:         string
  cantidad:       number
}

interface MitadItem {
  mitad:  number
  nombre: string
  extras: ExtraItem[]
}

interface ComboProdItem {
  nombre:   string
  cantidad: number
  tamano:   string | null
}

interface ItemPizzero {
  pedidoId:       number
  numeroPedido:   number
  detalleId:      number
  estadoPedido:   string
  hora:           string
  nombre:         string
  tamano:         string | null
  cantidad:       number
  extras:         ExtraItem[]
  mitades:        MitadItem[]
  notas:          string | null
  esCombo:        boolean
  comboProductos: ComboProdItem[]
}


const filtroActual    = ref<'todos' | 'pendiente' | 'listo'>('todos')
const busqueda        = ref('')
const cambiandoEstado = ref<number | null>(null)
const toast           = ref({ show: false, message: '' })


const turnoActivo = computed(() => {
  const turnosAbiertos = turnosStore.turnos.filter(t => t.abierto)
  if (turnosAbiertos.length === 0) return null
  return turnosAbiertos[0] ?? null
})


const cargarDatos = async () => {
  await Promise.all([
    pedidosStore.fetchPedidos(true),
    turnosStore.fetchTurnosAbiertos(),
  ])
}


const pedidosDelTurno = computed(() => {
  if (!turnoActivo.value) return []
  return pedidosStore.pedidos.filter(p => p.turno_id === turnoActivo.value!.id)
})


const todosLosItems = computed((): ItemPizzero[] => {
  const items: ItemPizzero[] = []

  for (const pedido of pedidosDelTurno.value) {
    const estadoNombre = pedido.estado?.nombre ?? ''
    if (['entregado', 'cancelado'].includes(estadoNombre)) continue

    const hora = new Date(pedido.fecha).toLocaleTimeString('es-BO', {
      hour: '2-digit', minute: '2-digit'
    })

    const numeroPedido: number = pedido.numero_turno ?? pedido.id

    for (const detalle of pedido.detalles) {

      if (detalle.combo_id) {
        const comboProductos: ComboProdItem[] = (detalle.combo?.productos ?? []).map((cp: any) => ({
          nombre:   cp.producto?.nombre ?? `Producto #${cp.producto_id}`,
          cantidad: cp.cantidad,
          tamano:   detalle.tamano_nombre ?? null,
        }))

        items.push({
          pedidoId:       pedido.id,
          numeroPedido,
          detalleId:      detalle.id,
          estadoPedido:   estadoNombre,
          hora,
          nombre:         `${detalle.combo?.nombre?.toUpperCase() ?? `COMBO #${detalle.combo_id}`}  [COMBO]`,
          tamano:         detalle.tamano_nombre ?? null,
          cantidad:       detalle.cantidad,
          extras:         [],
          mitades:        [],
          notas:          detalle.notas ?? null,
          esCombo:        true,
          comboProductos,
        })

      } else if (detalle.is_mitad) {
        const mitades: MitadItem[] = (detalle.mitades ?? []).map((m: any) => ({
          mitad:  m.mitad,
          nombre: m.producto?.nombre ?? `Pizza #${m.producto_id}`,
          extras: (m.extras ?? []).map((e: any) => ({
            ingrediente_id: e.ingrediente_id,
            nombre:         e.ingrediente?.nombre ?? `Ingrediente #${e.ingrediente_id}`,
            cantidad:       e.cantidad,
          })),
        }))

        items.push({
          pedidoId:       pedido.id,
          numeroPedido,
          detalleId:      detalle.id,
          estadoPedido:   estadoNombre,
          hora,
          nombre:         `MITAD/MITAD: ${mitades.map(m => m.nombre).join(' / ')}`,
          tamano:         detalle.tamano_nombre ?? null,
          cantidad:       detalle.cantidad,
          extras:         [],
          mitades,
          notas:          detalle.notas ?? null,
          esCombo:        false,
          comboProductos: [],
        })

      } else {
        const extras: ExtraItem[] = (detalle.extras ?? []).map((e: any) => ({
          ingrediente_id: e.ingrediente_id,
          nombre:         e.ingrediente?.nombre ?? `Ingrediente #${e.ingrediente_id}`,
          cantidad:       e.cantidad,
        }))

        items.push({
          pedidoId:       pedido.id,
          numeroPedido,
          detalleId:      detalle.id,
          estadoPedido:   estadoNombre,
          hora,
          nombre:         detalle.producto_nombre ?? `Producto #${detalle.producto_id}`,
          tamano:         detalle.tamano_nombre ?? null,
          cantidad:       detalle.cantidad,
          extras,
          mitades:        [],
          notas:          detalle.notas ?? null,
          esCombo:        false,
          comboProductos: [],
        })
      }
    }
  }

  return items.sort((a, b) => {
    const orden: Record<string, number> = {
      pendiente: 0, confirmado: 1, en_preparacion: 2, listo: 3
    }
    return (orden[a.estadoPedido] ?? 9) - (orden[b.estadoPedido] ?? 9)
  })
})


const itemsFiltrados = computed(() => {
  let lista = todosLosItems.value

  if (filtroActual.value === 'pendiente') {
    lista = lista.filter(i => i.estadoPedido !== 'listo')
  } else if (filtroActual.value === 'listo') {
    lista = lista.filter(i => i.estadoPedido === 'listo')
  }

  if (busqueda.value.trim()) {
    const term = busqueda.value.toLowerCase()
    lista = lista.filter(i =>
      String(i.numeroPedido).includes(term) ||
      i.nombre.toLowerCase().includes(term)
    )
  }

  return lista
})

const totalPendientes = computed(() =>
  todosLosItems.value.filter(i => i.estadoPedido !== 'listo').length
)
const totalListos = computed(() =>
  todosLosItems.value.filter(i => i.estadoPedido === 'listo').length
)


const estadoLabel = (estado: string): string => ({
  pendiente:      'PENDIENTE',
  confirmado:     'CONFIRMADO',
  en_preparacion: 'EN PREPARACION',
  listo:          'LISTO',
}[estado] ?? estado.toUpperCase())

const marcarListo = async (pedidoId: number) => {
  cambiandoEstado.value = pedidoId
  try {
    const resultado = await pedidosStore.cambiarEstado(pedidoId, { estado: 'listo' })
    if (resultado) {
      const item = todosLosItems.value.find(i => i.pedidoId === pedidoId)
      mostrarToast(`Pedido #${item?.numeroPedido ?? pedidoId} marcado como listo`)
    }
  } finally {
    cambiandoEstado.value = null
  }
}

const mostrarToast = (message: string) => {
  toast.value = { show: true, message }
  setTimeout(() => { toast.value.show = false }, 3000)
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}


const currentDateTime = ref('')
let intervalo: number
let intervaloRefresco: number

const actualizarFecha = () => {
  currentDateTime.value = new Date().toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

onMounted(async () => {
  actualizarFecha()
  intervalo = setInterval(actualizarFecha, 1000)
  await cargarDatos()
  intervaloRefresco = setInterval(cargarDatos, 30_000)
})

onUnmounted(() => {
  clearInterval(intervalo)
  clearInterval(intervaloRefresco)
})
</script>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }

.pizzero-view {
  width: 100%; max-width: 1600px;
  padding: 20px; margin: 0 auto;
  position: relative; z-index: 2;
}


/* ── Header ─────────────────────────────────────────────── */
.header {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 30px;
  flex-wrap: wrap; gap: 20px;
}

.logo-area { display: flex; align-items: center; gap: 20px; }

.logo {
  font-size: 32px; font-weight: 800; color: #ffffff;
  text-transform: uppercase; letter-spacing: 2px;
  text-shadow: 2px 2px 0 #ff0000, 4px 4px 0 rgba(0,0,0,0.5);
}
.logo span {
  color: #ff0000;
  text-shadow: 2px 2px 0 #ffffff, 4px 4px 0 rgba(0,0,0,0.5);
}

.user-info {
  background: #111111; padding: 10px 25px;
  border-radius: 12px; border: 1px solid #ff0000;
  display: flex; align-items: center; gap: 15px;
}
.user-info i { color: #ff0000; font-size: 20px; }
.user-name   { font-weight: 700; color: #ffffff; }
.user-role   { font-size: 12px; color: #ff0000; text-transform: uppercase; }

.logout-btn {
  background: transparent; border: 2px solid #ff0000;
  color: #ffffff; padding: 10px 20px; border-radius: 12px;
  cursor: pointer; font-weight: 600; transition: all 0.3s;
}
.logout-btn:hover { background: #ff0000; color: #ffffff; }


/* ── Panel ───────────────────────────────────────────────── */
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

.header-stats { display: flex; gap: 20px; flex-wrap: wrap; }

.stat-item {
  display: flex; align-items: center; gap: 8px;
  background: #1a1a1a; padding: 8px 18px;
  border-radius: 12px; border: 1px solid #333;
}
.stat-item i      { color: #ff0000; font-size: 16px; }
.stat-value       { font-size: 20px; font-weight: 800; color: #ffffff; }
.stat-label       { font-size: 11px; color: #999; text-transform: uppercase; }

.turno-badge               { border-color: #ff0000 !important; }
.turno-badge i             { color: #ff0000; }
.turno-badge .stat-value   { color: #ff0000; }
.sin-turno i               { color: #ffc107 !important; }

.date-time { color: #cccccc; font-size: 14px; font-weight: 500; }


/* ── Sin turno ───────────────────────────────────────────── */
.sin-turno-state {
  text-align: center; padding: 60px 20px;
  color: #ffc107; background: #f5f5f5;
}
.sin-turno-state i { font-size: 60px; margin-bottom: 16px; display: block; }
.sin-turno-state p { font-size: 16px; color: #555; }


/* ── Content ─────────────────────────────────────────────── */
.pos-content { padding: 25px; background: #f5f5f5; }

.filters-row {
  display: flex; align-items: center;
  gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
}

.category-tabs { display: flex; gap: 10px; flex-wrap: wrap; }

.category-tab {
  padding: 8px 20px; background: #000000; color: #ffffff;
  border: none; border-radius: 12px; cursor: pointer;
  font-weight: 600; transition: all 0.3s; font-size: 14px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.category-tab.active,
.category-tab:hover { background: #ff0000; }

.search-box {
  position: relative; flex: 1;
  min-width: 200px; max-width: 320px;
}
.search-box i {
  position: absolute; left: 14px; top: 50%;
  transform: translateY(-50%); color: #ff0000; font-size: 14px;
}
.search-box input {
  width: 100%; padding: 10px 18px 10px 40px;
  background: #ffffff; border: 2px solid #e0e0e0;
  border-radius: 12px; color: #000; font-size: 14px;
  outline: none; transition: all 0.3s;
}
.search-box input:focus { border-color: #ff0000; }

.refresh-btn {
  background: #000; color: #ff0000; border: none;
  width: 40px; height: 40px; border-radius: 12px;
  cursor: pointer; font-size: 16px; transition: all 0.3s;
  display: flex; align-items: center; justify-content: center;
}
.refresh-btn:hover:not(:disabled) { background: #ff0000; color: #fff; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.product-count { color: #666; font-size: 14px; font-weight: 600; white-space: nowrap; }


/* ── Estados vacíos / carga ──────────────────────────────── */
.loading-state,
.empty-state {
  text-align: center; padding: 60px 20px; color: #999;
}
.loading-state i,
.empty-state i {
  font-size: 60px; color: #e0e0e0;
  margin-bottom: 16px; display: block;
}
.loading-state i { color: #ff0000; }
.loading-state p,
.empty-state p   { font-size: 16px; }


/* ── Grid de pedidos ─────────────────────────────────────── */
.pedidos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}


/* ── Card ────────────────────────────────────────────────── */
.pedido-card {
  background: #ffffff; border: 2px solid #e0e0e0;
  border-radius: 12px; overflow: hidden;
  transition: all 0.3s; position: relative;
}
.pedido-card:hover {
  border-color: #ff0000; transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(255,0,0,0.18);
}
.pedido-card::before {
  content: ''; position: absolute; top: 0; left: 0;
  width: 100%; height: 4px; background: #ff0000;
  transform: scaleX(0); transition: transform 0.3s;
}
.pedido-card:hover::before { transform: scaleX(1); }

.pedido-card.estado-pendiente { border-left: 5px solid #ffc107; }
.pedido-card.estado-listo     { border-left: 5px solid #28a745; }


/* ── Card header ─────────────────────────────────────────── */
.card-header {
  padding: 14px 18px; background: rgba(0,0,0,0.04);
  border-bottom: 1px solid #e0e0e0;
  display: flex; justify-content: space-between; align-items: center;
}
.pedido-meta { display: flex; gap: 14px; }

.pedido-num,
.hora-info {
  display: flex; align-items: center;
  gap: 5px; color: #666; font-size: 13px;
}
.pedido-num i,
.hora-info i { color: #ff0000; }
.pedido-num  { font-weight: 700; color: #000; font-size: 14px; }

.estado-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 14px; border-radius: 12px;
  font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px;
}
.estado-pendiente .estado-badge { background: #ffc107; color: #000; }
.estado-listo     .estado-badge { background: #28a745; color: #fff; }


/* ── Card body ───────────────────────────────────────────── */
.card-body { padding: 18px; }

.pizza-header {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 8px;
}
.pizza-nombre {
  font-size: 18px; font-weight: 800;
  color: #000000; text-transform: uppercase;
}
.cantidad-badge {
  background: #ff0000; color: #ffffff;
  padding: 4px 12px; border-radius: 12px;
  font-weight: 700; font-size: 15px;
}

.tamano-info {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #555; margin-bottom: 10px;
}
.tamano-info i { color: #ff0000; font-size: 12px; }


/* ── Extras ──────────────────────────────────────────────── */
.extras-lista,
.combo-lista { margin-bottom: 10px; }

.extras-titulo {
  font-size: 11px; font-weight: 700; color: #888;
  text-transform: uppercase; letter-spacing: 1px;
  margin-bottom: 6px; display: flex; align-items: center; gap: 5px;
}
.extras-titulo i { color: #ff0000; }

.extra-chip {
  display: inline-block; background: #ffe5e5;
  border: 1px solid #ffaaaa; color: #990000;
  padding: 3px 10px; border-radius: 12px;
  font-size: 12px; font-weight: 600;
  margin: 2px 4px 2px 0;
}


/* ── Combo ───────────────────────────────────────────────── */
.combo-prod-chip {
  display: inline-block; background: #f0f4ff;
  border: 1px solid #ccd6ff; color: #1a3acc;
  padding: 3px 10px; border-radius: 12px;
  font-size: 12px; font-weight: 600;
  margin: 2px 4px 2px 0;
}
.combo-tamano { color: #555; font-weight: 400; }


/* ── Mitades ─────────────────────────────────────────────── */
.mitades-lista { margin-bottom: 10px; }

.mitad-bloque {
  background: #f8f9fa; border-radius: 8px;
  padding: 10px 12px; margin-bottom: 8px;
  border-left: 3px solid #ff0000;
}
.mitad-titulo {
  font-size: 13px; color: #333;
  margin-bottom: 6px; display: flex; align-items: center; gap: 6px;
}
.mitad-titulo i      { color: #ff0000; }
.mitad-titulo strong { color: #000; }


/* ── Notas ───────────────────────────────────────────────── */
.notas-especiales {
  display: flex; align-items: center; gap: 8px;
  background: #fff3cd; padding: 10px 14px;
  border-left: 4px solid #ffc107; border-radius: 4px;
  margin-top: 10px;
}
.notas-especiales i    { color: #e6a800; font-size: 14px; }
.notas-especiales span { color: #555; font-size: 13px; font-style: italic; }


/* ── Card footer ─────────────────────────────────────────── */
.card-footer {
  padding: 14px 18px; background: rgba(0,0,0,0.04);
  border-top: 1px solid #e0e0e0;
}

.action-btn {
  width: 100%; padding: 12px; border: none;
  border-radius: 12px; font-weight: 700; font-size: 14px;
  cursor: pointer; transition: all 0.3s;
  display: flex; align-items: center; justify-content: center;
  gap: 10px; text-transform: uppercase; letter-spacing: 1px;
}
.action-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.listo-btn { background: #000000; color: #ffffff; }
.listo-btn:hover:not(:disabled) {
  background: #ff0000; transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255,0,0,0.3);
}

.listo-label {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  color: #28a745; font-weight: 700; font-size: 14px;
  text-transform: uppercase; letter-spacing: 1px;
}


/* ── Toast ───────────────────────────────────────────────── */
.toast-notification {
  position: fixed; bottom: 28px; right: 28px;
  background: #111111; border-left: 5px solid #28a745;
  padding: 14px 22px; border-radius: 12px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.4); z-index: 9999;
}
.toast-notification i    { color: #28a745; font-size: 20px; }
.toast-notification span { color: #ffffff; font-weight: 600; font-size: 14px; }

.toast-slide-enter-active,
.toast-slide-leave-active { transition: all 0.3s ease; }
.toast-slide-enter-from,
.toast-slide-leave-to     { opacity: 0; transform: translateX(100%); }


/* ── Scrollbar ───────────────────────────────────────────── */
::-webkit-scrollbar       { width: 8px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #cc0000; }


/* ── Responsive tablet ───────────────────────────────────── */
@media (max-width: 900px) {
  .pedidos-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
}

/* ── Responsive móvil ────────────────────────────────────── */
@media (max-width: 600px) {

  /* Vista general */
  .pizzero-view { padding: 10px; }

  /* Header superior */
  .header {
    flex-direction: column; align-items: stretch;
    gap: 10px; margin-bottom: 16px;
  }
  .logo-area {
    flex-direction: row; justify-content: space-between; align-items: center;
  }
  .logo { font-size: 22px; letter-spacing: 1px; }
  .user-info { padding: 8px 14px; }
  .user-name { font-size: 13px; }
  .user-role { font-size: 10px; }
  .logout-btn { width: 100%; justify-content: center; padding: 10px; font-size: 13px; }

  /* Panel header */
  .pos-panel { border-radius: 12px; }
  .pos-header {
    flex-direction: column; align-items: flex-start;
    padding: 12px 14px; gap: 10px;
  }
  .pos-header h2 { font-size: 18px; }

  /* Stats */
  .header-stats { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .stat-item    { padding: 6px 10px; border-radius: 8px; gap: 6px; }
  .stat-value   { font-size: 16px; }
  .stat-label   { font-size: 10px; }

  .date-time { font-size: 11px; }

  /* Filtros */
  .pos-content { padding: 12px; }
  .filters-row { flex-direction: column; align-items: stretch; gap: 8px; }

  .category-tabs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
  .category-tab  { padding: 8px 4px; font-size: 11px; text-align: center; border-radius: 8px; }

  .search-box { max-width: 100%; width: 100%; }

  /* Fila refresh + contador */
  .refresh-btn   { width: 100%; border-radius: 8px; height: 36px; }
  .product-count { font-size: 12px; text-align: right; }

  /* Grid de pedidos: 1 columna en móvil */
  .pedidos-grid { grid-template-columns: 1fr; gap: 12px; }

  /* Card */
  .pedido-card { border-radius: 10px; }
  .pedido-card:hover { transform: none; }

  .card-header { padding: 10px 12px; flex-wrap: wrap; gap: 6px; }
  .pedido-meta { gap: 10px; }
  .pedido-num  { font-size: 13px; }
  .hora-info   { font-size: 12px; }
  .estado-badge { font-size: 10px; padding: 3px 10px; }

  .card-body { padding: 12px; }
  .pizza-nombre   { font-size: 15px; }
  .cantidad-badge { font-size: 13px; padding: 3px 10px; }

  .card-footer { padding: 10px 12px; }
  .action-btn  { padding: 11px; font-size: 13px; }
  .listo-label { font-size: 12px; }

  /* Toast más pequeño y ancho completo */
  .toast-notification {
    bottom: 14px; right: 12px; left: 12px;
    padding: 12px 16px; border-radius: 10px;
  }
  .toast-notification span { font-size: 13px; }
}
</style>