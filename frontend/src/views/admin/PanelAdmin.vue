<template>
  <div class="container">

    
    <div class="header">
      <div class="logo-area">
        <div class="logo"><span>EL</span> TORAZO</div>
        <div class="user-chip">
          <i class="fas fa-user-circle"></i>
          <div>
            <div class="chip-name">{{ nombre }}</div>
            <div class="chip-role">Administrador</div>
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="datetime">{{ currentDateTime }}</div>
        <button class="logout-btn" @click="logout">
          <i class="fas fa-sign-out-alt"></i> Cerrar sesión
        </button>
      </div>
    </div>

    
    <div class="panel">

      
      <div class="stats-strip">
        <div class="stat-item">
          <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
          <div>
            <div class="stat-label">Ventas del turno</div>
            <div class="stat-value">
              <span v-if="turnosStore.loading.resumen" class="stat-loading">
                <i class="fas fa-spinner fa-spin"></i>
              </span>
              <span v-else>Bs. {{ totalVendido.toFixed(2) }}</span>
            </div>
            <div class="stat-trend up">
              <i class="fas fa-user"></i> {{ cajeroActivo }}
            </div>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
          <div>
            <div class="stat-label">Pedidos del turno</div>
            <div class="stat-value">
              <span v-if="turnosStore.loading.resumen" class="stat-loading">
                <i class="fas fa-spinner fa-spin"></i>
              </span>
              <span v-else>{{ totalPedidos }}</span>
            </div>
            <div class="stat-trend up">
              <i class="fas fa-receipt"></i> Facturas: {{ totalFacturas }}
            </div>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon red-icon"><i class="fas fa-boxes"></i></div>
          <div>
            <div class="stat-label">Stock crítico</div>
            <div class="stat-value red">{{ lowStockItems }}</div>
            <div class="stat-trend dn"><i class="fas fa-exclamation-triangle"></i> Atención</div>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon"><i class="fas fa-cash-register"></i></div>
          <div>
            <div class="stat-label">Fondo de caja</div>
            <div class="stat-value">
              <span v-if="turnosStore.loading.resumen" class="stat-loading">
                <i class="fas fa-spinner fa-spin"></i>
              </span>
              <span v-else>Bs. {{ montoInicio.toFixed(2) }}</span>
            </div>
            <div class="stat-trend up">
              <i class="fas fa-door-open"></i> Apertura del turno
            </div>
          </div>
        </div>
      </div>

      
      <div class="tabs-nav">
        <button
          v-for="tab in tabs" :key="tab.id"
          class="tab-btn"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          <i :class="['fas', tab.icon]"></i>
          {{ tab.name }}
        </button>
      </div>

      
      <div class="tab-content">
        <ProductosTab  v-if="currentTab === 'products'"  />
        <InventarioTab v-if="currentTab === 'inventory'" />
        <VentasTab     v-if="currentTab === 'sales'"     />
        <PersonalTab   v-if="currentTab === 'users'"     @delete-user="onDeleteUser" />
        <CombosTab     v-if="currentTab === 'combos'"    />
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter }         from 'vue-router'
import { useAuthStore }      from '@/stores/auth'
import { useStoreProductos } from '@/stores/productos/productos'
import { useBebidasStore }   from '@/stores/productos/bebidas'
import { useStorePersonal }  from '@/stores/admin/personal'
import { useStoreTurnos }    from '@/stores/turnos/store_turno.ts'
import { useStoreCombos }    from '@/stores/combos/combo_store'
import ProductosTab  from '@/components/panel_admin/ProductosTab.vue'
import InventarioTab from '@/components/panel_admin/InventarioTab.vue'
import VentasTab     from '@/components/panel_admin/VentasTab.vue'
import PersonalTab   from '@/components/panel_admin/PersonalTab.vue'
import CombosTab     from '@/components/panel_admin/CombosTab.vue'

const authStore     = useAuthStore()
const productsStore = useStoreProductos()
const bebidasStore  = useBebidasStore()
const personalStore = useStorePersonal()
const turnosStore   = useStoreTurnos()
const combosStore   = useStoreCombos()
const router        = useRouter()

authStore.init()

const nombre = computed(() => authStore.user?.nombre)
const logout = () => { authStore.logout(); router.push('/login') }


const currentTab = ref('products')
const tabs = [
  { id: 'products',  name: 'Productos',  icon: 'fa-pizza-slice' },
  { id: 'inventory', name: 'Inventario', icon: 'fa-boxes'       },
  { id: 'sales',     name: 'Ventas',     icon: 'fa-chart-bar'   },
  { id: 'users',     name: 'Personal',   icon: 'fa-users-cog'   },
  { id: 'combos',    name: 'Combos',     icon: 'fa-layer-group' },
]


const totalVendido  = computed(() => turnosStore.resumen_turno?.total_vendido  ?? 0)
const totalPedidos  = computed(() => turnosStore.resumen_turno?.total_pedidos  ?? 0)
const totalFacturas = computed(() => turnosStore.resumen_turno?.total_facturas ?? 0)
const montoInicio   = computed(() => turnosStore.resumen_turno?.monto_inicio   ?? 0)
const cajeroActivo  = computed(() => turnosStore.resumen_turno?.usuario        ?? 'Sin turno activo')

const lowStockItems = computed(() =>
  bebidasStore.bebidas.filter(b => b.stock !== null && b.stock <= 5).length
)


const loadResumenTurnoActivo = async () => {
  await turnosStore.fetchTurnosAbiertos()
  const turnoAbierto = turnosStore.turnosAbiertos[0]
  if (!turnoAbierto) return
  await turnosStore.fetchResumenTurno(turnoAbierto.id)
}


function onDeleteUser(usuario: any) {
  if (confirm(`¿Eliminar al usuario "${usuario.nombre}"?`)) {
    alert(`Usuario #${usuario.id} eliminado (simulado)`)
  }
}


const currentDateTime = ref('')
let intervalo: number

const updateDateTime = () => {
  currentDateTime.value = new Date().toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

onMounted(() => {
  updateDateTime()
  intervalo = setInterval(updateDateTime, 1000)
  loadResumenTurnoActivo()
  productsStore.fetchProductos()
  bebidasStore.fetchBebidas()
  personalStore.fetchPersonal()
  combosStore.fetchCombos()
})

onUnmounted(() => clearInterval(intervalo))
</script>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }

.container {
  width: 100%; max-width: 1600px;
  padding: 20px; margin: 0 auto;
  font-family: 'Montserrat', sans-serif;
  background: #000; min-height: 100vh; color: #fff;
}


/* ── Header ─────────────────────────────────────────────── */
.header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
}

.logo-area { display: flex; align-items: center; gap: 16px; }

.logo {
  font-size: 28px; font-weight: 800; color: #fff;
  text-transform: uppercase; letter-spacing: 2px;
  text-shadow: 2px 2px 0 #ff0000;
}
.logo span { color: #ff0000; text-shadow: 2px 2px 0 #fff; }

.user-chip {
  display: flex; align-items: center; gap: 10px;
  background: #111; padding: 8px 18px;
  border-radius: 50px; border: 1px solid #ff0000;
}
.user-chip > i { color: #ff0000; font-size: 18px; }
.chip-name { font-size: 13px; font-weight: 700; color: #fff; }
.chip-role { font-size: 11px; color: #ff0000; text-transform: uppercase; letter-spacing: 0.5px; }

.header-right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

.datetime { font-size: 12px; color: #666; max-width: 260px; text-align: right; }

.logout-btn {
  padding: 8px 18px; background: transparent;
  border: 1px solid #ff0000; color: #fff; border-radius: 50px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  font-family: 'Montserrat', sans-serif; transition: all 0.2s;
}
.logout-btn:hover { background: #ff0000; color: #000; }


/* ── Panel ───────────────────────────────────────────────── */
.panel {
  background: #fff; border-radius: 18px;
  border: 1px solid #ff0000; overflow: hidden;
  box-shadow: 0 16px 40px rgba(255,0,0,0.15);
}


/* ── Stats ───────────────────────────────────────────────── */
.stats-strip {
  background: #000; border-bottom: 2px solid #ff0000;
  display: flex; align-items: center; padding: 18px 28px;
  gap: 0; flex-wrap: wrap;
}

.stat-item {
  display: flex; align-items: center; gap: 12px;
  flex: 1; min-width: 160px; padding: 4px 0;
}

.stat-divider {
  width: 1px; height: 40px; background: #222;
  margin: 0 20px; flex-shrink: 0;
}

.stat-icon {
  width: 40px; height: 40px; background: #ff0000;
  border-radius: 10px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0;
}
.stat-icon.red-icon { background: #1a0000; border: 1px solid #ff0000; }
.stat-icon i { font-size: 16px; color: #fff; }
.stat-icon.red-icon i { color: #ff0000; }

.stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
.stat-value { font-size: 18px; font-weight: 800; color: #fff; }
.stat-value.red { color: #ff0000; }
.stat-loading { font-size: 14px; color: #ff0000; }
.stat-trend { font-size: 11px; font-weight: 600; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
.stat-trend.up { color: #28a745; }
.stat-trend.dn { color: #ffc107; }


/* ── Tabs ────────────────────────────────────────────────── */
.tabs-nav {
  display: flex; gap: 0; background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0; padding: 0 24px;
  overflow-x: auto;
}

.tab-btn {
  padding: 14px 22px; background: transparent; border: none;
  border-bottom: 3px solid transparent; color: #888;
  font-size: 13px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; gap: 7px;
  font-family: 'Montserrat', sans-serif; text-transform: uppercase;
  letter-spacing: 0.5px; transition: all 0.2s; white-space: nowrap;
}
.tab-btn i { font-size: 14px; }
.tab-btn:hover { color: #ff0000; }
.tab-btn.active { color: #ff0000; border-bottom-color: #ff0000; }


/* ── Tab content ─────────────────────────────────────────── */
.tab-content { padding: 24px; background: #f5f5f5; }


/* ── Scrollbar ───────────────────────────────────────────── */
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 3px; }


/* ── Responsive tablet ───────────────────────────────────── */
@media (max-width: 900px) {
  .stats-strip {
    flex-direction: column; gap: 14px; padding: 16px 20px;
  }
  .stat-divider { display: none; }
  .stat-item    { width: 100%; min-width: 0; }
}

/* ── Responsive móvil ────────────────────────────────────── */
@media (max-width: 600px) {

  /* Contenedor */
  .container { padding: 10px; }

  /* Header */
  .header {
    flex-direction: column; align-items: stretch;
    gap: 10px; margin-bottom: 14px;
  }
  .logo-area {
    flex-direction: row; justify-content: space-between; align-items: center;
  }
  .logo { font-size: 20px; letter-spacing: 1px; }
  .user-chip { padding: 6px 12px; }
  .chip-name { font-size: 12px; }
  .chip-role { font-size: 10px; }

  .header-right {
    flex-direction: row; justify-content: space-between;
    align-items: center; gap: 8px;
  }
  .datetime   { font-size: 10px; text-align: left; max-width: 100%; }
  .logout-btn { font-size: 11px; padding: 7px 14px; }

  /* Panel */
  .panel { border-radius: 12px; }

  /* Stats: 2 columnas en móvil */
  .stats-strip {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px; padding: 12px;
    flex-direction: unset;
  }
  .stat-divider { display: none; }
  .stat-item {
    flex-direction: column; align-items: flex-start;
    gap: 6px; min-width: 0; padding: 10px;
    background: #111; border-radius: 10px;
    border: 1px solid #1f1f1f;
  }
  .stat-icon   { width: 32px; height: 32px; border-radius: 8px; }
  .stat-icon i { font-size: 13px; }
  .stat-label  { font-size: 10px; }
  .stat-value  { font-size: 15px; }
  .stat-trend  { font-size: 10px; }

  /* Tabs: scroll horizontal sin scrollbar visible */
  .tabs-nav {
    padding: 0 8px;
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .tabs-nav::-webkit-scrollbar { display: none; }
  .tab-btn {
    padding: 10px 12px; font-size: 11px;
    gap: 4px; letter-spacing: 0; flex-shrink: 0;
  }
  .tab-btn i { font-size: 12px; }

  /* Contenido del tab */
  .tab-content { padding: 12px; }
}
</style>