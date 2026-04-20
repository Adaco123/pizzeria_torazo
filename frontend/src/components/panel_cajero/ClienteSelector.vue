<template>
  <div class="cliente-selector">

    
    <div v-if="!clienteSeleccionado" class="no-cliente" @click="abrirModal">
      <i class="fas fa-user-plus"></i>
      <span>SELECCIONAR CLIENTE PARA FACTURA</span>
    </div>

    
    <div v-else class="cliente-info" @click="abrirModal">
      <div class="cliente-avatar">
        <i class="fas fa-user-circle"></i>
      </div>
      <div class="cliente-detalles">
        <div class="cliente-nombre">{{ clienteSeleccionado.nombre }}</div>
        <div class="cliente-documento">
          <span v-if="clienteSeleccionado.nit">NIT: {{ clienteSeleccionado.nit }}</span>
          <span v-if="clienteSeleccionado.telefono"> · Tel: {{ clienteSeleccionado.telefono }}</span>
        </div>
      </div>
      <button class="cambiar-cliente" @click.stop="abrirModal">
        <i class="fas fa-sync-alt"></i>
      </button>
    </div>

    
    <div v-if="showModal" class="modal" @click.self="cerrarModal">
      <div class="modal-content">
        <h3><i class="fas fa-users"></i> SELECCIONAR CLIENTE</h3>

        
        <div class="cliente-tabs">
          <button
            class="tab-btn"
            :class="{ active: tabActivo === 'buscar' }"
            @click="tabActivo = 'buscar'"
          >
            <i class="fas fa-search"></i> BUSCAR CLIENTE
          </button>
          <button
            class="tab-btn"
            :class="{ active: tabActivo === 'nuevo' }"
            @click="tabActivo = 'nuevo'"
          >
            <i class="fas fa-user-plus"></i> NUEVO CLIENTE
          </button>
        </div>

        
        <div v-if="tabActivo === 'buscar'" class="tab-content">
          <div class="buscador">
            <i class="fas fa-search"></i>
            <input
              type="text"
              v-model="busqueda"
              placeholder="Buscar por nombre, teléfono o NIT..."
            />
          </div>

          <div v-if="store.loading.fetch" class="estado-info">
            <i class="fas fa-spinner fa-spin"></i> Buscando...
          </div>
          <div v-else-if="store.error" class="estado-error">
            {{ store.error }}
          </div>
          <div v-else-if="resultados.length > 0" class="resultados-busqueda">
            <div
              v-for="cliente in resultados"
              :key="cliente.id"
              class="cliente-item"
              @click="seleccionarCliente(cliente)"
            >
              <div class="cliente-item-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="cliente-item-info">
                <div class="cliente-item-nombre">{{ cliente.nombre }}</div>
                <div class="cliente-item-doc">
                  <span v-if="cliente.nit">NIT: {{ cliente.nit }}</span>
                  <span v-if="cliente.telefono"> · Tel: {{ cliente.telefono }}</span>
                  <span v-if="cliente.correo" class="cliente-item-email">
                    <i class="fas fa-envelope"></i> {{ cliente.correo }}
                  </span>
                </div>
              </div>
              <button class="seleccionar-btn">
                <i class="fas fa-check"></i>
              </button>
            </div>
          </div>
          <div v-else-if="busqueda.length > 0" class="sin-resultados">
            <i class="fas fa-user-slash"></i>
            <p>No se encontraron clientes</p>
            <button class="crear-nuevo-btn" @click="tabActivo = 'nuevo'">
              <i class="fas fa-plus"></i> CREAR NUEVO CLIENTE
            </button>
          </div>
          <div v-else class="sin-busqueda">
            <i class="fas fa-search"></i>
            <p>Ingresa un término de búsqueda</p>
          </div>
        </div>

        
        <div v-if="tabActivo === 'nuevo'" class="tab-content">
          <div class="cliente-form">

            
            <div class="form-group">
              <label>
                Nombre Completo
                <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  type="text"
                  v-model="form.nombre"
                  placeholder="Ej: Adalid Garcia"
                  :class="{
                    'input-error': errors.nombre,
                    'input-valid': form.nombre && !errors.nombre
                  }"
                  @input="validarCampo('nombre', form.nombre)"
                />
                <span v-if="form.nombre" class="input-icon">
                  <i class="fas"
                    :class="!errors.nombre ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
                  ></i>
                </span>
              </div>
              <transition name="fade">
                <span v-if="errors.nombre" class="field-error">
                  <i class="fas fa-exclamation-triangle"></i> {{ errors.nombre }}
                </span>
              </transition>
            </div>

            <div class="form-row">

              
              <div class="form-group">
                <label>Teléfono <span class="optional">opcional</span></label>
                <div class="input-wrapper">
                  <input
                    type="tel"
                    v-model="form.telefono"
                    placeholder="Ej: 76543210"
                    :class="{
                      'input-error': errors.telefono,
                      'input-valid': form.telefono && !errors.telefono
                    }"
                    @input="validarCampo('telefono', form.telefono ?? '', false)"
                  />
                  <span v-if="form.telefono" class="input-icon">
                    <i class="fas"
                      :class="!errors.telefono ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
                    ></i>
                  </span>
                </div>
                <transition name="fade">
                  <span v-if="errors.telefono" class="field-error">
                    <i class="fas fa-exclamation-triangle"></i> {{ errors.telefono }}
                  </span>
                </transition>
              </div>

              
              <div class="form-group">
                <label>NIT <span class="required">*</span></label>
                <div class="input-wrapper">
                  <input
                    type="text"
                    v-model="form.nit"
                    placeholder="Ej: 12345671"
                    :class="{
                      'input-error': errors.nit,
                      'input-valid': form.nit && !errors.nit
                    }"
                    @input="validarCampo('nit', form.nit ?? '')"
                  />
                  <span v-if="form.nit" class="input-icon">
                    <i class="fas"
                      :class="!errors.nit ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
                    ></i>
                  </span>
                </div>
                <transition name="fade">
                  <span v-if="errors.nit" class="field-error">
                    <i class="fas fa-exclamation-triangle"></i> {{ errors.nit }}
                  </span>
                </transition>
              </div>

            </div>

            
            <div class="form-group">
              <label>Correo <span class="optional">opcional</span></label>
              <div class="input-wrapper">
                <input
                  type="email"
                  v-model="form.correo"
                  placeholder="adalid@email.com"
                  :class="{
                    'input-error': errors.correo,
                    'input-valid': form.correo && !errors.correo
                  }"
                  @input="validarCampo('correo', form.correo ?? '', false)"
                />
                <span v-if="form.correo" class="input-icon">
                  <i class="fas"
                    :class="!errors.correo ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
                  ></i>
                </span>
              </div>
              <transition name="fade">
                <span v-if="errors.correo" class="field-error">
                  <i class="fas fa-exclamation-triangle"></i> {{ errors.correo }}
                </span>
              </transition>
            </div>

            
            <div class="form-group">
              <label>Dirección <span class="optional">opcional</span></label>
              <div class="input-wrapper">
                <input
                  type="text"
                  v-model="form.direccion"
                  placeholder="Dirección completa"
                  :class="{
                    'input-error': errors.direccion,
                    'input-valid': form.direccion && !errors.direccion
                  }"
                  @input="validarCampo('direccion', form.direccion ?? '', false)"
                />
                <span v-if="form.direccion" class="input-icon">
                  <i class="fas"
                    :class="!errors.direccion ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
                  ></i>
                </span>
              </div>
              <transition name="fade">
                <span v-if="errors.direccion" class="field-error">
                  <i class="fas fa-exclamation-triangle"></i> {{ errors.direccion }}
                </span>
              </transition>
            </div>

            <div class="modal-buttons">
              <button
                class="modal-btn primary"
                :disabled="store.loading.guardar || !formularioValido"
                @click="crearCliente"
              >
                <i class="fas" :class="store.loading.guardar ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                {{ store.loading.guardar ? 'GUARDANDO...' : 'GUARDAR CLIENTE' }}
              </button>
              <button class="modal-btn secondary" @click="cerrarModal">
                CANCELAR
              </button>
            </div>

          </div>
        </div>

        
        <div class="cliente-final-section">
          <button class="cliente-final-btn" @click="seleccionarConsumidorFinal">
            <i class="fas fa-user"></i>
            CONSUMIDOR FINAL (Sin factura)
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStoreClientes } from '@/stores/clientes/clientes'
import { useValidacion, REGEX } from '@/composables/useValidacion'
import type { Cliente, ClientePayload } from '@/services/cliente_service'

const store = useStoreClientes()

defineProps<{
  clienteSeleccionado?: Cliente | null
}>()

const emit = defineEmits<{
  (e: 'update:clienteSeleccionado', cliente: Cliente | null): void
}>()

const showModal = ref(false)
const tabActivo = ref<'buscar' | 'nuevo'>('buscar')
const busqueda  = ref('')

const form = ref<ClientePayload>({
  nombre: '', telefono: '', direccion: '', correo: '', nit: ''
})

const {
  errors,
  touched,
  validarCampo,
  campoConError,
  campoValido,
  resetValidacion,
} = useValidacion()

const formularioValido = computed(() => {
  const camposConError = Object.values(errors.value).some(e => e !== '')
  const nombreOk = REGEX.nombre.test(form.value.nombre?.trim() ?? '')
  const nitOk    = REGEX.nit.test(form.value.nit?.trim() ?? '')
  return nombreOk && nitOk && !camposConError
})

const resultados = computed<Cliente[]>(() =>
  busqueda.value.length === 0 ? [] : store.buscarPorNombre(busqueda.value)
)


function abrirModal() {
  showModal.value = true
  tabActivo.value = 'buscar'
  busqueda.value  = ''
  store.error     = null
  store.fetchClientes()
}

function cerrarModal() {
  showModal.value = false
  resetForm()
}

function resetForm() {
  form.value   = { nombre: '', telefono: '', direccion: '', correo: '', nit: '' }
  resetValidacion()
}

function seleccionarCliente(cliente: Cliente) {
  emit('update:clienteSeleccionado', cliente)
  cerrarModal()
}

function seleccionarConsumidorFinal() {
  emit('update:clienteSeleccionado', {
    id: 11, nombre: 'Consumidor Final',
    telefono: '', direccion: '',
    activo: true, created_at: '', updated_at: ''
  })
  cerrarModal()
}

async function crearCliente() {
  const campos: Array<keyof typeof REGEX> = ['nombre', 'telefono', 'nit', 'correo', 'direccion']
  campos.forEach(campo => {
    const valor = String((form.value as any)[campo] ?? '')
    const requerido = campo === 'nombre' || campo === 'nit'
    validarCampo(campo, valor, requerido)
  })

  if (!formularioValido.value) return

  const nuevo = await store.agregarCliente(form.value)
  if (nuevo) seleccionarCliente(nuevo)
}
</script>

<style scoped>
.cliente-selector { margin-bottom: 20px; }

.no-cliente {
  background: #f8f9fa;
  border: 2px dashed #ff0000;
  border-radius: 10px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  color: #ff0000;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.no-cliente:hover { background: #ff0000; color: white; border-color: white; }

.cliente-info {
  background: #000;
  border-radius: 10px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  border: 2px solid #ff0000;
}
.cliente-avatar i  { font-size: 40px; color: #ff0000; }
.cliente-detalles  { flex: 1; }
.cliente-nombre    { color: white; font-weight: 700; font-size: 16px; }
.cliente-documento { color: #ff0000; font-size: 14px; }

.cambiar-cliente {
  background: #ff0000;
  color: white;
  border: none;
  width: 36px; height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}
.cambiar-cliente:hover { transform: rotate(180deg); }

.modal {
  display: flex;
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.9);
  justify-content: center;
  align-items: center;
  z-index: 1100;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: #ffffff;
  padding: 30px;
  border-radius: 20px;
  max-width: 700px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  border-top: 8px solid #ff0000;
  border-bottom: 8px solid #ff0000;
}

.modal-content h3 {
  color: #000;
  font-size: 24px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 3px solid #ff0000;
  display: flex;
  align-items: center;
  gap: 10px;
}

.cliente-tabs { display: flex; gap: 10px; margin-bottom: 20px; }

.tab-btn {
  flex: 1;
  padding: 12px;
  border: none;
  background: #f0f0f0;
  color: #666;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.tab-btn.active             { background: #ff0000; color: white; }
.tab-btn:hover:not(.active) { background: #e0e0e0; }

.tab-content {
  min-height: 300px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 10px;
}

.buscador { position: relative; margin-bottom: 20px; }
.buscador i {
  position: absolute;
  left: 12px; top: 50%;
  transform: translateY(-50%);
  color: #999;
}
.buscador input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  box-sizing: border-box;
}
.buscador input:focus { outline: none; border-color: #ff0000; }

.estado-info  { text-align: center; padding: 20px; color: #999; }
.estado-error { text-align: center; padding: 20px; color: #ff0000; }

.resultados-busqueda { display: flex; flex-direction: column; gap: 10px; }

.cliente-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}
.cliente-item:hover {
  border-color: #ff0000;
  transform: translateX(5px);
  box-shadow: 0 5px 15px rgba(255,0,0,0.1);
}
.cliente-item-avatar i { font-size: 30px; color: #ff0000; }
.cliente-item-info     { flex: 1; }
.cliente-item-nombre   { font-weight: 700; color: #000; }
.cliente-item-doc      { font-size: 13px; color: #666; }
.cliente-item-email    { margin-left: 10px; color: #ff0000; }

.seleccionar-btn {
  background: #28a745;
  color: white;
  border: none;
  width: 36px; height: 36px;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: all 0.3s;
}
.cliente-item:hover .seleccionar-btn { opacity: 1; }

.sin-resultados, .sin-busqueda {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}
.sin-resultados i, .sin-busqueda i { font-size: 50px; margin-bottom: 15px; }

.crear-nuevo-btn {
  background: #ff0000;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  margin-top: 15px;
  cursor: pointer;
  font-weight: 600;
}


.cliente-form { display: flex; flex-direction: column; gap: 15px; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group { display: flex; flex-direction: column; gap: 4px; }

.form-group label {
  font-weight: 600;
  color: #000;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}


.required { color: #ff0000; font-size: 15px; }


.optional {
  font-size: 11px;
  font-weight: 400;
  color: #999;
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 20px;
}


.input-wrapper { position: relative; }

.form-group input {
  width: 100%;
  padding: 10px 36px 10px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}
.form-group input:focus       { outline: none; border-color: #ff0000; }
.form-group input.input-error { border-color: #ff0000; background: #fff5f5; }
.form-group input.input-valid { border-color: #22c55e; background: #f0fdf4; }


.input-icon {
  position: absolute;
  right: 10px; top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  pointer-events: none;
}
.icon-ok  { color: #22c55e; }
.icon-err { color: #ff0000; }


.field-error {
  font-size: 12px;
  font-weight: 600;
  color: #cc0000;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}


.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; transform: translateY(-4px); }


.cliente-final-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px dashed #e0e0e0;
}

.cliente-final-btn {
  width: 100%;
  padding: 15px;
  background: #000;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s;
}
.cliente-final-btn:hover { background: #333; transform: translateY(-2px); }

.modal-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }

.modal-btn {
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  font-size: 14px;
}
.modal-btn.primary   { background: #ff0000; color: #fff; }
.modal-btn.secondary { background: #000; color: #fff; }
.modal-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255,0,0,0.3); }
.modal-btn:disabled  { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .form-row     { grid-template-columns: 1fr; }
  .cliente-tabs { flex-direction: column; }
}
</style>