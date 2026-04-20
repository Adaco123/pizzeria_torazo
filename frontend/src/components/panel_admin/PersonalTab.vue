<template>
  <div class="tab-shell">

    
    <div class="tab-header">
      <h3><i class="fas fa-users-cog"></i> GESTIÓN DE PERSONAL</h3>
      <button class="btn-primary" @click="showAddUsuario = true">
        <i class="fas fa-user-plus"></i> NUEVO USUARIO
      </button>
    </div>

    
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-users"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Total usuarios</div>
          <div class="kpi-value">{{ personalStore.usuarios.length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-user-check"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Activos</div>
          <div class="kpi-value">{{ personalStore.usuarios.filter(u => u.activo).length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-crown"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Administradores</div>
          <div class="kpi-value">{{ personalStore.usuarios.filter(u => u.rol === 'admin').length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-cash-register"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Cajeros</div>
          <div class="kpi-value">{{ personalStore.usuarios.filter(u => u.rol === 'cajero').length }}</div>
        </div>
      </div>
    </div>

    
    <div v-if="personalStore.loading" class="estado-carga">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Cargando personal...</span>
    </div>

    
    <div v-else-if="personalStore.error" class="estado-error">
      <i class="fas fa-exclamation-circle"></i>
      <span>{{ personalStore.error }}</span>
      <button class="btn-primary" @click="personalStore.fetchPersonal()">
        <i class="fas fa-redo"></i> Reintentar
      </button>
    </div>

    
    <div v-else class="dark-table-card">
      <div class="card-hd">
        <span class="card-title"><i class="fas fa-list"></i> LISTADO DE USUARIOS</span>
        <span class="card-count">{{ personalStore.usuarios.length }} registros</span>
      </div>
      <div class="table-scroll">
        <table class="dark-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Cédula</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="usuario in personalStore.usuarios" :key="usuario.id">
              <td class="mono">#{{ usuario.id }}</td>
              <td class="bold-white">{{ usuario.nombre }}</td>
              <td class="muted">{{ usuario.correo }}</td>
              <td class="mono">{{ usuario.cedula }}</td>
              <td>
                <span class="rol-pill" :class="'rol-' + usuario.rol">
                  {{ usuario.rol }}
                </span>
              </td>
              <td>
                <span class="status-pill" :class="usuario.activo ? 'pill-active' : 'pill-inactive'">
                  {{ usuario.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn-table btn-edit" @click="editUser(usuario)">
                    <i class="fas fa-edit"></i> EDITAR
                  </button>
                  <button class="btn-table btn-delete" @click="$emit('delete-user', usuario)">
                    <i class="fas fa-trash-alt"></i> ELIMINAR
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!personalStore.usuarios.length">
              <td colspan="7" class="empty-row">
                <i class="fas fa-users"></i> No hay personal registrado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    
    <AddUsuario
      :show="showAddUsuario"
      @close="closeAddUsuario"
      @saved="onUserSaved"
    />
    <PutUsuario
      :show="showPutUsuario"
      :usuarioId="selectedUsuarioId"
      @close="closePutUsuario"
    />

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useStorePersonal } from '@/stores/admin/personal'
import AddUsuario from '@/components/panel_admin/add_usuario.vue'
import PutUsuario from '@/components/panel_admin/put_usuario.vue'
import type { Usuario } from '@/services/admin_service'

defineEmits(['delete-user'])

const personalStore     = useStorePersonal()
const showAddUsuario    = ref(false)
const showPutUsuario    = ref(false)
const selectedUsuarioId = ref<number | null>(null)

function editUser(usuario: Usuario) {
  selectedUsuarioId.value = usuario.id
  showPutUsuario.value    = true
}

async function closeAddUsuario() {
  showAddUsuario.value = false
  await personalStore.fetchPersonal()
}

async function closePutUsuario() {
  showPutUsuario.value    = false
  selectedUsuarioId.value = null
  await personalStore.fetchPersonal()
}

async function onUserSaved() {
  await personalStore.fetchPersonal()
}
</script>

<style scoped>
.tab-shell { display: flex; flex-direction: column; gap: 18px; }

.tab-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 14px; border-bottom: 2px solid #ff0000; flex-wrap: wrap; gap: 12px;
}
.tab-header h3 {
  font-size: 16px; font-weight: 700; color: #000;
  text-transform: uppercase; display: flex; align-items: center; gap: 8px;
}
.tab-header h3 i { color: #ff0000; }

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

.estado-carga, .estado-error {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 40px; font-size: 14px;
}
.estado-carga { color: #888; }
.estado-error { color: #dc3545; flex-direction: column; }

.dark-table-card {
  background: #000; border-radius: 14px; border: 1px solid #222; overflow: hidden;
}
.card-hd {
  padding: 11px 16px; border-bottom: 1px solid #222;
  display: flex; align-items: center; justify-content: space-between;
}
.card-title {
  font-size: 12px; font-weight: 700; color: #ccc;
  text-transform: uppercase; letter-spacing: 0.5px;
  display: flex; align-items: center; gap: 7px;
}
.card-title i { color: #ff0000; }
.card-count { font-size: 12px; color: #555; }

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

.mono       { font-family: 'Courier New', monospace; font-size: 12px; }
.bold-white { font-weight: 700; color: #fff; }
.muted      { color: #666; font-size: 12px; }

.rol-pill {
  display: inline-block; padding: 3px 10px; border-radius: 50px;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;
}
.rol-admin  { background: rgba(255,0,0,0.15); color: #ff0000; border: 1px solid #ff0000; }
.rol-cajero { background: rgba(255,255,255,0.05); color: #888; border: 1px solid #333; }

.status-pill {
  display: inline-block; padding: 3px 9px; border-radius: 50px;
  font-size: 11px; font-weight: 700;
}
.pill-active   { background: rgba(40,167,69,0.15); color: #28a745; border: 1px solid #28a745; }
.pill-inactive { background: rgba(255,255,255,0.05); color: #555; border: 1px solid #333; }

.action-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.btn-table {
  padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: 700;
  cursor: pointer; border: none; display: flex; align-items: center; gap: 4px;
  font-family: 'Montserrat', sans-serif; transition: all 0.2s; text-transform: uppercase;
}
.btn-edit   { background: #ff0000; color: #fff; }
.btn-edit:hover   { background: #cc0000; }
.btn-delete { background: #1a1a1a; color: #ccc; border: 1px solid #333; }
.btn-delete:hover { background: #2a2a2a; }

.empty-row { text-align: center; color: #555; padding: 30px; }
.empty-row i { margin-right: 8px; color: #ff0000; }

@media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .kpi-grid { grid-template-columns: 1fr; } }
</style>