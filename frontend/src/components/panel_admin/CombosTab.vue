<template>
  <div class="tab-shell">

    
    <div class="tab-header">
      <h3><i class="fas fa-layer-group"></i> GESTIÓN DE COMBOS</h3>
      <div class="action-group">
        <button class="btn-primary" @click="openAddModal">
          <i class="fas fa-plus"></i> NUEVO COMBO
        </button>
      </div>
    </div>

    
    <div v-if="combosStore.loading.fetch" class="loading-bar">
      <i class="fas fa-spinner fa-spin"></i> Cargando combos...
    </div>

    
    <div v-if="combosStore.error && !combosStore.loading.fetch" class="error-banner">
      <i class="fas fa-exclamation-triangle"></i> {{ combosStore.error }}
    </div>

    
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-layer-group"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Total combos</div>
          <div class="kpi-value">{{ combosStore.combos.length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-toggle-on"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Activos</div>
          
          <div class="kpi-value">{{ combosStore.combosActivos.length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-toggle-off"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Inactivos</div>
          <div class="kpi-value">{{ combosStore.combos.length - combosStore.combosActivos.length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-tags"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Precio promedio</div>
          <div class="kpi-value">Bs {{ precioPromedio }}</div>
        </div>
      </div>
    </div>

    
    <div class="filters-bar">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input
          type="text"
          v-model="comboSearch"
          placeholder="Buscar combo..."
        />
      </div>
      <select v-model="estadoFilter" class="filter-select">
        <option value="">Todos los estados</option>
        <option value="activo">Activos</option>
        <option value="inactivo">Inactivos</option>
      </select>
    </div>

    
    <div class="dark-table-card">
      <div class="card-hd">
        <span class="card-title"><i class="fas fa-list"></i> LISTADO DE COMBOS</span>
        <span class="card-count">{{ filteredCombos.length }} registros</span>
      </div>
      <div class="table-scroll">
        <table class="dark-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Productos incluidos</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="combo in filteredCombos" :key="combo.id">
              <td class="mono">#{{ combo.id }}</td>
              <td class="product-name-cell">
                <i class="fas fa-layer-group"></i>
                <span class="bold-white">{{ combo.nombre }}</span>
              </td>
              <td>
                <div class="productos-chips">
                  
                  <span
                    v-for="item in combo.productos"
                    :key="item.producto_id"
                    class="producto-chip"
                  >
                    x{{ item.cantidad }} {{ item.nombre }}
                  </span>
                  <span v-if="!combo.productos || combo.productos.length === 0" class="muted">
                    Sin productos
                  </span>
                </div>
              </td>
              <td class="bold-white">Bs {{ combo.precio.toFixed(2) }}</td>
              <td>
                <span class="status-pill" :class="combo.activo ? 'pill-active' : 'pill-inactive'">
                  {{ combo.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn-table btn-edit" @click="editCombo(combo)">
                    <i class="fas fa-edit"></i> EDITAR
                  </button>
                  <button
                    class="btn-table btn-delete"
                    :disabled="deletingId === combo.id"
                    @click="handleDelete(combo)"
                  >
                    <i
                      class="fas"
                      :class="deletingId === combo.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'"
                    ></i>
                    {{ deletingId === combo.id ? '...' : 'ELIMINAR' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredCombos.length && !combosStore.loading.fetch">
              <td colspan="6" class="empty-row">
                <i class="fas fa-layer-group"></i> No hay combos registrados
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    
    <AddCombo
      :show="showAddModal"
      @close="closeAddModal"
    />

    
    <PutCombo
      :show="showEditModal"
      :comboId="selectedComboId"
      @close="closeEditModal"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStoreCombos } from '@/stores/combos/combo_store'
import type { Combo }     from '@/services/combo_service'
import {REGEX, useValidacion} from'@/composables/useValidacion'
import AddCombo from '@/components/panel_admin/add_combo.vue'
import PutCombo from '@/components/panel_admin/put_combo.vue'


const combosStore = useStoreCombos()
const {errors, touched, validarCampo, validarPrecio, campoConError, campoValido, resetValidacion} =useValidacion()

const comboSearch     = ref('')
const estadoFilter    = ref('')
const showAddModal    = ref(false)
const showEditModal   = ref(false)
const selectedComboId = ref<number | null>(null)
const deletingId      = ref<number | null>(null)


onMounted(() => combosStore.fetchCombos())


const filteredCombos = computed((): Combo[] =>
  combosStore.combos.filter(c => {
    const matchesSearch = c.nombre.toLowerCase().includes(comboSearch.value.toLowerCase())
    const matchesEstado =
      !estadoFilter.value ||
      (estadoFilter.value === 'activo'   &&  c.activo) ||
      (estadoFilter.value === 'inactivo' && !c.activo)
    return matchesSearch && matchesEstado
  })
)

const precioPromedio = computed(() => {
  const lista = combosStore.combos
  if (!lista.length) return '0.00'
  const total = lista.reduce((sum, c) => sum + c.precio, 0)
  return (total / lista.length).toFixed(2)
})


const openAddModal = () => { showAddModal.value = true }

const closeAddModal = async () => {
  showAddModal.value = false
  await combosStore.fetchCombos(true)   
}

const editCombo = (combo: Combo) => {
  selectedComboId.value = combo.id
  showEditModal.value   = true
}

const closeEditModal = async () => {
  showEditModal.value   = false
  selectedComboId.value = null
  await combosStore.fetchCombos(true)   
}

const handleDelete = async (combo: Combo) => {
  if (!confirm(`¿Estás seguro de eliminar el combo "${combo.nombre}"?`)) return
  deletingId.value = combo.id
  await combosStore.eliminarCombo(combo.id)
  deletingId.value = null
}
</script>

<style scoped>
.tab-shell { display: flex; flex-direction: column; gap: 18px; }


.loading-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; background: #111; border-radius: 10px;
  color: #888; font-size: 13px; border: 1px solid #222;
}
.error-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; background: rgba(255,0,0,0.08); border-radius: 10px;
  color: #ff4444; font-size: 13px; border: 1px solid rgba(255,0,0,0.3); font-weight: 600;
}


.tab-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 14px; border-bottom: 2px solid #ff0000; flex-wrap: wrap; gap: 12px;
}
.tab-header h3 {
  font-size: 16px; font-weight: 700; color: #000;
  text-transform: uppercase; display: flex; align-items: center; gap: 8px;
}
.tab-header h3 i { color: #ff0000; }
.action-group { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-primary {
  padding: 8px 18px; background: #ff0000; color: #fff;
  border: none; border-radius: 50px; font-size: 12px; font-weight: 700;
  text-transform: uppercase; cursor: pointer; display: flex; align-items: center; gap: 6px;
  font-family: 'Montserrat', sans-serif; transition: all 0.2s;
}
.btn-primary:hover { background: #cc0000; transform: translateY(-1px); }


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


.filters-bar { display: flex; gap: 12px; flex-wrap: wrap; }
.search-box { flex: 1; position: relative; min-width: 220px; }
.search-box i { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #555; font-size: 13px; }
.search-box input {
  width: 100%; padding: 10px 13px 10px 38px;
  background: #000; border: 1px solid #222; border-radius: 10px;
  color: #fff; font-size: 13px; font-family: 'Montserrat', sans-serif; transition: border-color 0.2s;
}
.search-box input::placeholder { color: #444; }
.search-box input:focus { border-color: #ff0000; outline: none; }
.filter-select {
  padding: 10px 14px; background: #000; border: 1px solid #222;
  border-radius: 10px; color: #ccc; font-size: 13px; min-width: 180px;
  cursor: pointer; font-family: 'Montserrat', sans-serif;
}
.filter-select:focus { border-color: #ff0000; outline: none; }


.dark-table-card { background: #000; border-radius: 14px; border: 1px solid #222; overflow: hidden; }
.card-hd { padding: 11px 16px; border-bottom: 1px solid #222; display: flex; align-items: center; justify-content: space-between; }
.card-title { font-size: 12px; font-weight: 700; color: #ccc; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 7px; }
.card-title i { color: #ff0000; }
.card-count { font-size: 12px; color: #555; }
.table-scroll { overflow-x: auto; }
.dark-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dark-table th { background: #111; color: #888; padding: 11px 14px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
.dark-table td { padding: 11px 14px; border-bottom: 1px solid #111; color: #ccc; }
.dark-table tbody tr:hover { background: #0d0d0d; }
.dark-table tbody tr:last-child td { border-bottom: none; }
.mono       { font-family: 'Courier New', monospace; font-size: 12px; }
.bold-white { font-weight: 700; color: #fff; }
.muted      { color: #666; font-size: 12px; }
.product-name-cell { display: flex; align-items: center; gap: 8px; }
.product-name-cell i { color: #ff0000; font-size: 16px; }


.productos-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.producto-chip {
  display: inline-block; padding: 3px 9px; border-radius: 50px; font-size: 11px; font-weight: 600;
  background: rgba(255,0,0,0.1); color: #ff6666; border: 1px solid rgba(255,0,0,0.3);
}


.status-pill { display: inline-block; padding: 3px 9px; border-radius: 50px; font-size: 11px; font-weight: 700; }
.pill-active   { background: rgba(40,167,69,0.15); color: #28a745; border: 1px solid #28a745; }
.pill-inactive { background: rgba(255,255,255,0.05); color: #555; border: 1px solid #333; }


.action-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.btn-table { padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: 700; cursor: pointer; border: none; display: flex; align-items: center; gap: 4px; font-family: 'Montserrat', sans-serif; transition: all 0.2s; text-transform: uppercase; }
.btn-edit         { background: #ff0000; color: #fff; }
.btn-edit:hover   { background: #cc0000; }
.btn-delete       { background: #1a1a1a; color: #ccc; border: 1px solid #333; }
.btn-delete:hover { background: #2a2a2a; }
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }
.empty-row { text-align: center; color: #555; padding: 30px; }
.empty-row i { margin-right: 8px; color: #ff0000; }


@media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .kpi-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .filters-bar { flex-direction: column; }
  .filter-select { width: 100%; }
  .action-group { width: 100%; }
  .btn-primary { flex: 1; justify-content: center; }
}
</style>