<template>
  <div class="tab-shell">

    
    <div class="tab-header">
      <h3><i class="fas fa-boxes"></i> CONTROL DE INVENTARIO</h3>
    </div>

    
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-wine-bottle"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Total bebidas</div>
          <div class="kpi-value">{{ bebidas.length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-check-circle"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Con stock</div>
          <div class="kpi-value">{{ bebidas.filter(b => !b.agotado && b.stock > 0).length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Stock bajo</div>
          <div class="kpi-value yellow">{{ bebidas.filter(b => !b.agotado && b.stock <= 5 && b.stock > 0).length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-times-circle"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Agotados</div>
          <div class="kpi-value red">{{ bebidas.filter(b => b.agotado || b.stock <= 0).length }}</div>
        </div>
      </div>
    </div>

    
    <div v-if="alertas.length" class="alertas-card">
      <div class="alertas-header">
        <i class="fas fa-exclamation-triangle"></i>
        ALERTAS DE STOCK BAJO ({{ alertas.length }})
      </div>
      <div class="alertas-grid">
        <div v-for="a in alertas" :key="a.id" class="alerta-item">
          <div class="alerta-info">
            <span class="alerta-nombre">{{ a.name }}</span>
            <span class="alerta-stock">{{ a.stock }} uds restantes</span>
          </div>
          <button class="btn-reponer" @click="abrirStock(a)">
            <i class="fas fa-plus"></i> Reponer
          </button>
        </div>
      </div>
    </div>

    <div v-else class="no-alertas">
      <i class="fas fa-check-circle"></i>
      <span>Sin alertas de stock — todo en orden</span>
    </div>

    
    <div class="movimientos-card">
      <div class="card-hd">
        <span class="card-title">
          <i class="fas fa-history"></i> ÚLTIMOS MOVIMIENTOS DE STOCK
        </span>
        <button class="btn-refresh" @click="recargarMovimientos" :disabled="movStore.loading">
          <i class="fas" :class="movStore.loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'"></i>
          {{ movStore.loading ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>

      
      <div v-if="movStore.loading && movStore.movimientos.length === 0" class="mov-empty">
        <i class="fas fa-spinner fa-spin"></i> Cargando movimientos...
      </div>

      
      <div v-else-if="movStore.movimientos.length === 0" class="mov-empty">
        <i class="fas fa-inbox"></i> Sin movimientos registrados aún
      </div>

      
      <div v-else class="mov-list">
        <div
          v-for="mov in movStore.movimientos"
          :key="mov.id"
          class="mov-item"
        >
          
          <div class="mov-icon">
            <i class="fas fa-plus-circle"></i>
          </div>

          
          <div class="mov-info">
            <span class="mov-producto">{{ mov.producto_nombre ?? '—' }}</span>
            <span class="mov-meta">
              <i class="fas fa-user-circle"></i> {{ mov.usuario_nombre ?? 'Desconocido' }}
              <span v-if="mov.turno_id" class="mov-turno">· Turno #{{ mov.turno_id }}</span>
            </span>
          </div>

          
          <div class="mov-fecha">
            <i class="fas fa-clock"></i>
            {{ formatDate(mov.fecha) }}
          </div>

          
          <div class="mov-qty-block">
            <span class="mov-qty">+{{ mov.cantidad }}</span>
            <span class="mov-rango">
              {{ mov.stock_anterior ?? '?' }} → {{ mov.stock_nuevo ?? '?' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    
    <div class="stock-visual-card">
      <div class="card-hd">
        <span class="card-title"><i class="fas fa-chart-bar"></i> STOCK ACTUAL</span>
      </div>
      <div class="stock-bars">
        <div v-for="b in bebidasOrdenadas" :key="b.producto_id" class="stock-bar-row">
          <div class="bar-label">{{ b.nombre }}</div>
          <div class="bar-bg">
            <div
              class="bar-fill"
              :style="{ width: pctStock(b) + '%', background: colorStock(b) }"
            ></div>
          </div>
          <div class="bar-nums">
            <span :style="{ color: colorStock(b) }">{{ b.stock ?? 0 }}</span>
            <span class="bar-max">/ {{ maxStock }}</span>
          </div>
        </div>
      </div>
    </div>

    
    <div class="dark-table-card">
      <div class="card-hd">
        <span class="card-title"><i class="fas fa-list"></i> DETALLE DE INVENTARIO</span>
      </div>
      <div class="table-scroll">
        <table class="dark-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock actual</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in inventory" :key="item.id">
              <td>
                <div class="prod-name">
                  <i class="fas fa-wine-bottle" style="color:#ff0000;font-size:14px;"></i>
                  {{ item.name }}
                </div>
              </td>
              <td>
                <span class="stock-pill" :class="stockClass(item.stock)">
                  {{ item.stock }} uds
                </span>
              </td>
              <td>
                <span class="status-pill" :class="item.agotado ? 'pill-agotado' : 'pill-ok'">
                  {{ item.agotado ? 'Agotado' : 'Disponible' }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn-table btn-edit" @click="abrirStock(item)">
                    <i class="fas fa-sliders-h"></i> AJUSTAR
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!inventory.length">
              <td colspan="4" class="empty-row">
                <i class="fas fa-boxes"></i> Sin bebidas registradas
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    
    <BebidasStockModal
      :show="showStockModal"
      :bebida="selectedBebida"
      @close="showStockModal = false; selectedBebida = null"
      @stock-updated="onStockUpdated"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBebidasStore }           from '@/stores/productos/bebidas'
import { useStoreProductos }         from '@/stores/productos/productos'
import { useMovimientosStockStore }  from '@/stores/movimientos/movimiento_store'
import BebidasStockModal             from '@/components/panel_cajero/add_bebida.vue'

const bebidasStore   = useBebidasStore()
const productosStore = useStoreProductos()
const movStore       = useMovimientosStockStore()

const showStockModal = ref(false)
const selectedBebida = ref<any>(null)

const bebidas = computed(() => bebidasStore.bebidas)

const maxStock = computed(() =>
  Math.max(...bebidas.value.map(b => b.stock ?? 0), 50)
)

const bebidasOrdenadas = computed(() =>
  [...bebidas.value].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
)

const inventory = computed(() =>
  bebidas.value.map(b => ({
    id:      b.producto_id,
    name:    b.nombre,
    stock:   b.stock ?? 0,
    agotado: b.agotado,
  }))
)

const alertas = computed(() =>
  bebidas.value
    .filter(b => b.stock !== null && b.stock <= 5)
    .map(b => ({ id: b.producto_id, name: b.nombre, stock: b.stock ?? 0 }))
)


function pctStock(b: any) {
  const s = b.stock ?? 0
  return Math.min(Math.round((s / maxStock.value) * 100), 100)
}

function colorStock(b: any) {
  const s = b.stock ?? 0
  if (b.agotado || s <= 0) return '#dc3545'
  if (s <= 5)              return '#ffc107'
  if (s <= 15)             return '#ff7700'
  return '#28a745'
}

function stockClass(s: number) {
  if (s <= 0)  return 'stock-agotado'
  if (s <= 5)  return 'stock-bajo'
  if (s <= 15) return 'stock-medio'
  return 'stock-ok'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-BO', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}


function abrirStock(item: any) {
  const bebida = bebidasStore.bebidas.find(b => b.producto_id === item.id)
  if (bebida) {
    selectedBebida.value = bebida
    showStockModal.value = true
  }
}

async function onStockUpdated() {
  await Promise.all([
    bebidasStore.fetchBebidas(),
    productosStore.fetchStockBebidas(),
    movStore.fetchTodos(20),          
  ])
}


async function recargarMovimientos() {
  await movStore.fetchTodos(20)
}


onMounted(async () => {
  await movStore.fetchTodos(20)
})
</script>

<style scoped>
.tab-shell { display: flex; flex-direction: column; gap: 18px; }

.tab-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 14px; border-bottom: 2px solid #ff0000;
}
.tab-header h3 {
  font-size: 16px; font-weight: 700; color: #000;
  text-transform: uppercase; display: flex; align-items: center; gap: 8px;
}
.tab-header h3 i { color: #ff0000; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

.kpi-card {
  background: #000; border-radius: 12px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  border: 1px solid #222; transition: transform 0.2s, box-shadow 0.2s;
}
.kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(255,0,0,0.2); }
.kpi-icon {
  width: 44px; height: 44px; background: #ff0000; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kpi-icon i { font-size: 18px; color: #fff; }
.kpi-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
.kpi-value { font-size: 22px; font-weight: 800; color: #fff; }
.kpi-value.red    { color: #ff0000; }
.kpi-value.yellow { color: #ffc107; }


.alertas-card {
  background: #000; border: 1px solid #333; border-radius: 14px; overflow: hidden;
}
.alertas-header {
  padding: 11px 16px; background: rgba(255,193,7,0.08);
  border-bottom: 1px solid #333; font-size: 12px; font-weight: 700;
  color: #ffc107; display: flex; align-items: center; gap: 8px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.alertas-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px; padding: 14px;
}
.alerta-item {
  background: #0d0d0d; border-radius: 10px; padding: 12px 14px;
  display: flex; justify-content: space-between; align-items: center;
  border-left: 3px solid #ffc107;
}
.alerta-info { display: flex; flex-direction: column; gap: 3px; }
.alerta-nombre { font-size: 13px; font-weight: 600; color: #ccc; }
.alerta-stock  { font-size: 11px; color: #ffc107; }
.btn-reponer {
  padding: 5px 12px; background: #ff0000; color: #fff;
  border: none; border-radius: 50px; font-size: 11px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 5px;
  font-family: 'Montserrat', sans-serif; transition: background 0.2s;
  white-space: nowrap;
}
.btn-reponer:hover { background: #cc0000; }

.no-alertas {
  background: #000; border: 1px solid #222; border-radius: 14px;
  padding: 18px 20px; display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: #28a745;
}
.no-alertas i { font-size: 18px; }


.movimientos-card {
  background: #000;
  border: 1px solid #222;
  border-radius: 14px;
  overflow: hidden;
}

.card-hd {
  padding: 11px 16px;
  border-bottom: 1px solid #222;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 12px; font-weight: 700; color: #ccc;
  text-transform: uppercase; letter-spacing: 0.5px;
  display: flex; align-items: center; gap: 7px;
}
.card-title i { color: #ff0000; }

.btn-refresh {
  padding: 5px 12px;
  background: #111;
  border: 1px solid #333;
  border-radius: 50px;
  color: #888;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.btn-refresh:hover:not(:disabled) {
  background: #ff0000;
  border-color: #ff0000;
  color: #fff;
}
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

.mov-empty {
  padding: 24px;
  text-align: center;
  color: #555;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.mov-list {
  display: flex;
  flex-direction: column;
  max-height: 280px;
  overflow-y: auto;
}

.mov-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 16px;
  border-bottom: 1px solid #111;
  transition: background 0.15s;
}
.mov-item:last-child { border-bottom: none; }
.mov-item:hover      { background: #0a0a0a; }


.mov-icon {
  width: 34px; height: 34px;
  background: rgba(40, 167, 69, 0.12);
  border: 1px solid rgba(40, 167, 69, 0.3);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.mov-icon i { color: #28a745; font-size: 14px; }


.mov-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.mov-producto {
  font-size: 13px;
  font-weight: 700;
  color: #ddd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mov-meta {
  font-size: 11px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
}
.mov-meta i { color: #ff0000; font-size: 10px; }

.mov-turno {
  color: #555;
  font-size: 10px;
}


.mov-fecha {
  font-size: 11px;
  color: #555;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.mov-fecha i { color: #333; font-size: 10px; }


.mov-qty-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  min-width: 56px;
}

.mov-qty {
  font-size: 16px;
  font-weight: 800;
  color: #28a745;
}

.mov-rango {
  font-size: 10px;
  color: #555;
  font-weight: 600;
  white-space: nowrap;
}


.mov-list::-webkit-scrollbar       { width: 4px; }
.mov-list::-webkit-scrollbar-track { background: #0a0a0a; }
.mov-list::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }


.stock-visual-card {
  background: #000; border-radius: 14px; border: 1px solid #222; overflow: hidden;
}

.stock-bars { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.stock-bar-row { display: flex; align-items: center; gap: 10px; }
.bar-label { font-size: 12px; color: #ccc; min-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-bg { flex: 1; height: 8px; background: #1a1a1a; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.bar-nums { font-size: 12px; min-width: 60px; text-align: right; display: flex; gap: 2px; justify-content: flex-end; }
.bar-max { color: #555; }


.dark-table-card {
  background: #000; border-radius: 14px; border: 1px solid #222; overflow: hidden;
}
.table-scroll { overflow-x: auto; }
.dark-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dark-table th {
  background: #111; color: #888; padding: 11px 14px;
  text-align: left; font-weight: 600; font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
}
.dark-table td { padding: 11px 14px; border-bottom: 1px solid #111; color: #ccc; }
.dark-table tbody tr:hover { background: #0d0d0d; }
.dark-table tbody tr:last-child td { border-bottom: none; }

.prod-name { display: flex; align-items: center; gap: 8px; }

.stock-pill {
  display: inline-block; padding: 3px 9px; border-radius: 50px;
  font-size: 11px; font-weight: 700;
}
.stock-ok      { background: rgba(40,167,69,0.15);  color: #28a745; border: 1px solid #28a745; }
.stock-medio   { background: rgba(255,119,0,0.15);  color: #ff7700; border: 1px solid #ff7700; }
.stock-bajo    { background: rgba(255,193,7,0.15);  color: #ffc107; border: 1px solid #ffc107; }
.stock-agotado { background: rgba(220,53,69,0.15);  color: #dc3545; border: 1px solid #dc3545; }

.status-pill {
  display: inline-block; padding: 3px 9px; border-radius: 50px;
  font-size: 11px; font-weight: 700;
}
.pill-ok      { background: rgba(40,167,69,0.15); color: #28a745; border: 1px solid #28a745; }
.pill-agotado { background: rgba(220,53,69,0.15); color: #dc3545; border: 1px solid #dc3545; }

.action-btns { display: flex; gap: 6px; }
.btn-table {
  padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: 700;
  cursor: pointer; border: none; display: flex; align-items: center; gap: 4px;
  font-family: 'Montserrat', sans-serif; transition: all 0.2s; text-transform: uppercase;
}
.btn-edit { background: #ff0000; color: #fff; }
.btn-edit:hover { background: #cc0000; }

.empty-row { text-align: center; color: #555; padding: 30px; }
.empty-row i { margin-right: 8px; color: #ff0000; }

@media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .kpi-grid { grid-template-columns: 1fr; } }
</style>