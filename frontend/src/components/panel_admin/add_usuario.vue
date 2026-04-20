<template>
  <div v-if="show" class="modal" @click.self="$emit('close')">
    <div class="modal-content">

      <div class="modal-header">
        <h3>
          <i class="fas fa-user-plus"></i>
          NUEVO USUARIO
        </h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="product-form">

        <div class="user-preview">
          <div class="user-avatar" :class="{ 'has-name': form.nombre.trim() }">
            <span v-if="iniciales">{{ iniciales }}</span>
            <i v-else class="fas fa-user"></i>
          </div>
          <div class="user-preview-info">
            <span class="preview-nombre">{{ form.nombre || 'Nombre del usuario' }}</span>
            <span class="preview-rol">{{ rolLabel || 'Sin rol asignado' }}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="nombre">
            <i class="fas fa-user"></i> Nombre completo
            <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <input
              id="nombre"
              type="text"
              v-model="form.nombre"
              placeholder="Ej: Juan Pérez"
              :class="{
                'input-error': campoConError('nombre'),
                'input-valid': campoValido('nombre', form.nombre)
              }"
              @input="validarCampo('nombre', form.nombre)"
            />
            <span v-if="touched.nombre && form.nombre" class="input-icon">
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

        <div class="form-group">
          <label for="correo">
            <i class="fas fa-envelope"></i> Correo electrónico
            <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <input
              id="correo"
              type="text"
              v-model="form.correo"
              placeholder="Ej: juan@pizzeria.com"
              :class="{
                'input-error': campoConError('correo'),
                'input-valid': campoValido('correo', form.correo)
              }"
              @input="validarCampo('correo', form.correo)"
            />
            <span v-if="touched.correo && form.correo" class="input-icon">
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
          <label for="cedula">
            <i class="fas fa-id-card"></i> Cédula de identidad
            <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <input
              id="cedula"
              type="text"
              v-model="form.cedula"
              placeholder="Ej: 12345678"
              :class="{
                'input-error': campoConError('cedula'),
                'input-valid': campoValido('cedula', form.cedula)
              }"
              @input="validarCampo('cedula', form.cedula)"
            />
            <span v-if="touched.cedula && form.cedula" class="input-icon">
              <i class="fas"
                :class="!errors.cedula ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
              ></i>
            </span>
          </div>
          <transition name="fade">
            <span v-if="errors.cedula" class="field-error">
              <i class="fas fa-exclamation-triangle"></i> {{ errors.cedula }}
            </span>
          </transition>
        </div>

        <div class="form-group">
          <label for="codigo">
            <i class="fas fa-barcode"></i> Código de empleado
            <span class="optional-label">(opcional)</span>
          </label>
          <div class="input-wrapper">
            <input
              id="codigo"
              type="text"
              v-model="form.codigo"
              placeholder="Ej: EMP-001"
              :class="{
                'input-error': campoConError('codigo'),
                'input-valid': campoValido('codigo', form.codigo)
              }"
              @input="form.codigo ? validarCampo('codigo', form.codigo) : (errors.codigo = '')"
            />
            <span v-if="touched.codigo && form.codigo" class="input-icon">
              <i class="fas"
                :class="!errors.codigo ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
              ></i>
            </span>
          </div>
          <transition name="fade">
            <span v-if="errors.codigo" class="field-error">
              <i class="fas fa-exclamation-triangle"></i> {{ errors.codigo }}
            </span>
          </transition>
        </div>

        <div class="form-group">
          <label>
            <i class="fas fa-shield-alt"></i> Rol
            <span class="required">*</span>
          </label>
          <div class="roles-grid">
            <div
              v-for="rol in ROLES"
              :key="rol.id"
              class="rol-card"
              :class="{ selected: form.rol_id === rol.id }"
              @click="seleccionarRol(rol.id)"
            >
              <span class="rol-emoji">{{ rol.emoji }}</span>
              <span class="rol-nombre">{{ rol.nombre }}</span>
              <span class="rol-desc">{{ rol.desc }}</span>
            </div>
          </div>
          <transition name="fade">
            <span v-if="errors.rol_id" class="field-error">
              <i class="fas fa-exclamation-triangle"></i> {{ errors.rol_id }}
            </span>
          </transition>
        </div>

        <div class="section-block">
          <div class="section-title">
            <i class="fas fa-lock"></i>
            Contraseña inicial
          </div>

          <div class="form-group">
            <label for="contra">
              <i class="fas fa-key"></i> Contraseña
              <span class="required">*</span>
            </label>
            <div
              class="input-password"
              :class="{
                'prefix-error': campoConError('contra'),
                'prefix-valid': campoValido('contra', form.contra)
              }"
            >
              <input
                id="contra"
                :type="showContra ? 'text' : 'password'"
                v-model="form.contra"
                placeholder="••••••••"
                @input="validarCampo('contra', form.contra)"
              />
              <button type="button" class="eye-btn" @click="showContra = !showContra">
                <i class="fas" :class="showContra ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
            <transition name="fade">
              <span v-if="errors.contra" class="field-error">
                <i class="fas fa-exclamation-triangle"></i> {{ errors.contra }}
              </span>
            </transition>

            <div class="password-strength" v-if="form.contra">
              <div class="strength-bar">
                <div
                  class="strength-fill"
                  :class="passwordStrength.clase"
                  :style="{ width: passwordStrength.porcentaje + '%' }"
                ></div>
              </div>
              <span class="strength-label" :class="passwordStrength.clase">
                {{ passwordStrength.texto }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="contra_confirm">
              <i class="fas fa-check-double"></i> Confirmar contraseña
              <span class="required">*</span>
            </label>
            <div
              class="input-password"
              :class="{
                'prefix-error': touched.contra_confirm && !!errors.contra_confirm,
                'prefix-valid': touched.contra_confirm && !errors.contra_confirm && !!form.contra_confirm
              }"
            >
              <input
                id="contra_confirm"
                :type="showConfirm ? 'text' : 'password'"
                v-model="form.contra_confirm"
                placeholder="••••••••"
                @input="validarContraConfirm(form.contra, form.contra_confirm)"
              />
              <button type="button" class="eye-btn" @click="showConfirm = !showConfirm">
                <i class="fas" :class="showConfirm ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
            <transition name="fade">
              <span v-if="errors.contra_confirm" class="field-error">
                <i class="fas fa-exclamation-triangle"></i> {{ errors.contra_confirm }}
              </span>
            </transition>
          </div>
        </div>

        <div class="modal-buttons">
          <button type="submit" class="modal-btn primary" :disabled="loading || !formularioValido">
            <i class="fas" :class="loading ? 'fa-spinner fa-spin' : 'fa-user-plus'"></i>
            {{ loading ? 'CREANDO...' : 'CREAR USUARIO' }}
          </button>
          <button type="button" class="modal-btn secondary" :disabled="loading" @click="$emit('close')">
            <i class="fas fa-times"></i> CANCELAR
          </button>
        </div>

        <div v-if="serverError" class="form-error">{{ serverError }}</div>
        <div v-if="success" class="form-success">
          <i class="fas fa-check-circle"></i> {{ success }}
        </div>

      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStoreUsuarios } from '@/stores/users/store_users'
import { useValidacion, REGEX } from '@/composables/useValidacion'
import type { UsuarioPayload } from '@/services/usuario_service'

const props = defineProps<{ show: boolean }>()
const emit  = defineEmits<{ close: []; saved: [] }>()

const usuariosStore = useStoreUsuarios()

const {
  errors,
  touched,
  validarCampo,
  validarContraConfirm,
  validarRol,
  campoConError,
  campoValido,
  resetValidacion,
} = useValidacion()


const ROLES = [
  //{ id: 1, nombre: 'Administrador', emoji: '👑', desc: 'Acceso total'     },
  { id: 2, nombre: 'Cajero',        emoji: '💰', desc: 'Caja y pagos'     },
  { id: 3, nombre: 'Pizzero',       emoji: '👨‍🍳', desc: 'Cocina y pedidos' },
] as const

const defaultForm = () => ({
  nombre:         '',
  correo:         '',
  cedula:         '',
  codigo:         '',
  rol_id:         0,
  contra:         '',
  contra_confirm: '',
})

const form        = ref(defaultForm())
const loading     = ref(false)
const serverError = ref('')
const success     = ref('')
const showContra  = ref(false)
const showConfirm = ref(false)

const iniciales = computed(() =>
  form.value.nombre.trim()
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
)

const rolLabel = computed(() =>
  ROLES.find(r => r.id === form.value.rol_id)?.nombre ?? ''
)

const passwordStrength = computed(() => {
  const pass = form.value.contra
  if (!pass) return { texto: '', clase: '', porcentaje: 0 }
  let score = 0
  if (pass.length >= 8)          score++
  if (/[A-Z]/.test(pass))        score++
  if (/[0-9]/.test(pass))        score++
  if (/[^A-Za-z0-9]/.test(pass)) score++
  const niveles = [
    { texto: 'Muy débil', clase: 'muy-debil', porcentaje: 25  },
    { texto: 'Débil',     clase: 'debil',     porcentaje: 50  },
    { texto: 'Media',     clase: 'media',     porcentaje: 75  },
    { texto: 'Fuerte',    clase: 'fuerte',    porcentaje: 100 },
  ]
  return niveles[Math.max(0, Math.min(niveles.length - 1, score - 1))]!
})

const formularioValido = computed(() => {
  const camposOk =
    REGEX.nombre.test(form.value.nombre.trim()) &&
    REGEX.correo.test(form.value.correo.trim()) &&
    REGEX.cedula.test(form.value.cedula.trim()) &&
    REGEX.contra.test(form.value.contra)        &&
    form.value.contra === form.value.contra_confirm &&
    form.value.rol_id > 0
  const sinErrores = Object.values(errors.value).every(e => !e)
  return camposOk && sinErrores
})

function seleccionarRol(id: number) {
  form.value.rol_id = id
  validarRol(id)
}

watch(() => props.show, (visible) => {
  if (visible) {
    form.value        = defaultForm()
    serverError.value = ''
    success.value     = ''
    showContra.value  = false
    showConfirm.value = false
    resetValidacion()
  }
})

async function handleSubmit() {

  validarCampo('nombre', form.value.nombre)
  validarCampo('correo', form.value.correo)
  validarCampo('cedula', form.value.cedula)
  validarCampo('contra', form.value.contra)
  validarContraConfirm(form.value.contra, form.value.contra_confirm)
  validarRol(form.value.rol_id)
  if (form.value.codigo) validarCampo('codigo', form.value.codigo)

  if (!formularioValido.value) return

  const payload: UsuarioPayload = {
    nombre: form.value.nombre.trim(),
    correo: form.value.correo.trim(),
    cedula: form.value.cedula.trim(),
    contra: form.value.contra,
    rol_id: form.value.rol_id,
    ...(form.value.codigo.trim() && { codigo: form.value.codigo.trim() }),
  }

  loading.value     = true
  serverError.value = ''
  success.value     = ''

  try {
    const newUser = await usuariosStore.registrarUsuario(payload)

    if (!newUser) {
      serverError.value = usuariosStore.error || 'No se pudo crear el usuario'
      return
    }

    success.value = `Usuario "${newUser.nombre}" creado correctamente`
    emit('saved')
    setTimeout(() => {
      success.value = ''
      emit('close')
    }, 1200)

  } catch {
    serverError.value = 'Error de servidor al crear el usuario'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }

.modal {
  display: flex;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(6px);
  padding: 20px;
}

.modal-content {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-x: hidden;
  overflow-y: auto;
  border-top: 8px solid #ff0000;
  border-bottom: 8px solid #ff0000;
  box-shadow: 0 25px 60px rgba(255, 0, 0, 0.25);
  animation: slideIn 0.25s ease;
}

@keyframes slideIn {
  from { transform: translateY(-30px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 28px 18px;
  border-bottom: 3px solid #ff0000;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}

.modal-header h3 {
  color: #000;
  font-size: 20px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Montserrat', sans-serif;
}
.modal-header h3 i { color: #ff0000; }

.close-btn {
  width: 36px; height: 36px;
  background: #000; color: #fff;
  border: none; border-radius: 50%;
  cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.close-btn:hover { background: #ff0000; }

.product-form {
  padding: 24px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: 'Montserrat', sans-serif;
}

.user-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border: 2px solid #e8e8e8;
  border-radius: 14px;
}

.user-avatar {
  width: 56px; height: 56px;
  background: #e0e0e0;
  color: #aaa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  font-family: 'Montserrat', sans-serif;
  flex-shrink: 0;
  transition: background 0.3s, color 0.3s;
}

.user-avatar.has-name { background: #ff0000; color: #fff; }

.user-preview-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }

.preview-nombre {
  font-size: 14px; font-weight: 700; color: #000;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.preview-rol { font-size: 11px; color: #888; font-weight: 600; }

.form-group { display: flex; flex-direction: column; gap: 8px; }

.form-group label {
  color: #000; font-weight: 700; font-size: 14px;
  display: flex; align-items: center; gap: 7px;
}
.form-group label i { color: #ff0000; font-size: 13px; }

.required { color: #ff0000; font-size: 15px; font-weight: 800; }

.optional-label { color: #999; font-weight: 400; font-size: 12px; margin-left: 4px; }

.input-wrapper { position: relative; }

.input-icon {
  position: absolute;
  right: 12px; top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  pointer-events: none;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 12px 38px 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  font-family: 'Montserrat', sans-serif;
  color: #000;
  background: #fafafa;
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #ff0000;
  box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
  outline: none;
  background: #fff;
}

.form-group input.input-error  { border-color: #ff0000; background: #fff5f5; }
.form-group input.input-valid  { border-color: #22c55e; background: #f0fdf4; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12); }

.icon-ok  { color: #22c55e; }
.icon-err { color: #ff0000; }

.roles-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.rol-card {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 4px; padding: 14px 10px;
  border: 2px solid #e0e0e0; border-radius: 12px;
  cursor: pointer; background: #fafafa;
  transition: all 0.2s; text-align: center;
}

.rol-card:hover { border-color: #ff0000; background: #fff5f5; transform: translateY(-2px); }

.rol-card.selected {
  border-color: #ff0000; background: #ff0000;
  box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
}

.rol-emoji { font-size: 22px; line-height: 1; }
.rol-nombre { font-size: 12px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: 0.3px; }
.rol-desc   { font-size: 10px; color: #999; font-weight: 600; }
.rol-card.selected .rol-nombre,
.rol-card.selected .rol-desc { color: #fff; }

.section-block {
  background: #fafafa;
  border: 2px solid #e8e8e8;
  border-radius: 14px;
  padding: 18px;
  display: flex; flex-direction: column; gap: 16px;
}

.section-title {
  font-weight: 800; font-size: 13px;
  text-transform: uppercase; letter-spacing: 0.8px;
  color: #000; display: flex; align-items: center; gap: 8px;
}
.section-title i { color: #ff0000; }

.input-password {
  display: flex; align-items: center;
  border: 2px solid #e0e0e0;
  border-radius: 10px; overflow: hidden;
  background: #fafafa;
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
}

.input-password:focus-within {
  border-color: #ff0000;
  box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
  background: #fff;
}

.input-password.prefix-error { border-color: #ff0000; background: #fff5f5; }
.input-password.prefix-valid { border-color: #22c55e; background: #f0fdf4; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12); }

.input-password input {
  border: none !important; box-shadow: none !important;
  border-radius: 0 !important;
  flex: 1; background: transparent;
  padding: 12px 14px !important;
}
.input-password input:focus { border: none; box-shadow: none; outline: none; }

.eye-btn {
  padding: 0 14px; height: 100%;
  background: none; border: none;
  color: #aaa; cursor: pointer; font-size: 14px;
  transition: color 0.2s;
  display: flex; align-items: center;
}
.eye-btn:hover { color: #ff0000; }

.password-strength { display: flex; align-items: center; gap: 10px; }

.strength-bar {
  flex: 1; height: 4px;
  background: #e0e0e0; border-radius: 4px; overflow: hidden;
}

.strength-fill {
  height: 100%; border-radius: 4px;
  transition: width 0.3s ease, background 0.3s ease;
}

.strength-fill.muy-debil { background: #dc3545; }
.strength-fill.debil     { background: #fd7e14; }
.strength-fill.media     { background: #ffc107; }
.strength-fill.fuerte    { background: #28a745; }

.strength-label { font-size: 11px; font-weight: 700; white-space: nowrap; }
.strength-label.muy-debil { color: #dc3545; }
.strength-label.debil     { color: #fd7e14; }
.strength-label.media     { color: #ffc107; }
.strength-label.fuerte    { color: #28a745; }

.field-error {
  color: #cc0000; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; gap: 5px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; transform: translateY(-4px); }

.modal-buttons {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 12px; margin-top: 6px;
}

.modal-btn {
  padding: 14px; border: none; border-radius: 50px;
  font-weight: 700; font-size: 14px; cursor: pointer;
  transition: all 0.25s; text-transform: uppercase;
  font-family: 'Montserrat', sans-serif; letter-spacing: 0.5px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

.modal-btn.primary {
  background: #ff0000; color: #fff;
  box-shadow: 0 4px 12px rgba(255,0,0,0.3);
}
.modal-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255,0,0,0.4);
}
.modal-btn.secondary { background: #000; color: #fff; }
.modal-btn.secondary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
}
.modal-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.form-error {
  color: #ff3333; font-weight: 600; text-align: center; font-size: 13px;
  padding: 10px; background: #fff5f5;
  border-radius: 8px; border: 1px solid #ffcdcd;
}

.form-success {
  color: #28a745; font-weight: 600; text-align: center; font-size: 13px;
  padding: 10px; background: #f0fff4;
  border-radius: 8px; border: 1px solid #b7ebc4;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }

@media (max-width: 480px) {
  .modal-content  { border-radius: 16px; }
  .product-form   { padding: 20px; }
  .roles-grid     { grid-template-columns: repeat(2, 1fr); }
  .modal-buttons  { grid-template-columns: 1fr; }
}
</style>