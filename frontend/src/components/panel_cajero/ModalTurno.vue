<template>
  <div v-if="show" class="modal" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>
        <i
          class="fas"
          :class="mode === 'inicio' ? 'fa-play' : 'fa-stop'"
          style="color:#ff0000;"
        ></i>
        {{ mode === 'inicio' ? 'INICIAR TURNO' : 'CERRAR TURNO' }}
      </h3>

      <div class="usuario-info">
        <p><strong>Usuario:</strong> {{ nombre }}</p>
        <p v-if="mode === 'cierre'"><strong>ID Turno:</strong> #{{ turnoId }}</p>
        <p v-else><strong>Rol:</strong> {{ rol }}</p>
      </div>

      <p class="modal-hint">
        {{ mode === 'inicio' ? 'Ingresa el monto inicial en caja:' : 'Ingresa el monto final en caja:' }}
      </p>

      <div class="input-wrapper">
        <input
          type="text"
          v-model="montoRaw"
          :placeholder="mode === 'inicio' ? 'Ej: 500 o 500.00' : 'Monto de cierre'"
          class="monto-input"
          :class="{
            'input-error': errorLocal,
            'input-valid': montoRaw && !errorLocal && montoValido
          }"
          @keyup.enter="confirmar"
          @input="validarEnTiempoReal"
        />
        
        <span v-if="montoRaw" class="input-icon">
          <i
            class="fas"
            :class="montoValido && !errorLocal ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
          ></i>
        </span>
      </div>

      
      <transition name="fade">
        <div v-if="errorLocal" class="modal-error">
          <i class="fas fa-exclamation-triangle"></i> {{ errorLocal }}
        </div>
        <div v-else-if="montoRaw && montoValido" class="modal-success">
          <i class="fas fa-check-circle"></i> Monto válido
        </div>
        <div v-else-if="error" class="modal-error">
          <i class="fas fa-exclamation-triangle"></i> {{ error }}
        </div>
      </transition>

      <div class="modal-buttons">
        <button
          class="modal-btn primary"
          @click="confirmar"
          :disabled="loading || !montoValido"
        >
          <i class="fas" :class="loading ? 'fa-spinner fa-spin' : (mode === 'inicio' ? 'fa-play' : 'fa-stop')"></i>
          {{ loading
            ? (mode === 'inicio' ? 'INICIANDO...' : 'CERRANDO...')
            : (mode === 'inicio' ? 'INICIAR TURNO' : 'CERRAR TURNO') }}
        </button>
        <button
          class="modal-btn secondary"
          @click="$emit('close')"
          :disabled="loading"
        >
          CANCELAR
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  show:    boolean
  mode:    'inicio' | 'cierre'
  nombre:  string | undefined
  rol:     string | undefined
  turnoId: number | null
  loading: boolean
  error:   string
}>()

const emit = defineEmits<{
  (e: 'close'):                  void
  (e: 'confirm', monto: number): void
}>()

const montoRaw   = ref<string>('')
const errorLocal = ref<string>('')


const MONTO_REGEX = /^\d+(\.\d{1,2})?$/


const validarMonto = (valor: string): string => {
  const trimmed = valor.trim()
  if (!trimmed)
    return 'El monto es obligatorio.'
  if (!MONTO_REGEX.test(trimmed))
    return 'Solo números. Máx. 2 decimales. Ej: 100.50'
  const num = parseFloat(trimmed)
  if (num <= 0)
    return 'El monto debe ser mayor a 0.'
  if (num > 9_999_999)
    return 'El monto excede el límite permitido (9,999,999).'
  return ''
}


const montoValido = computed(() =>
  montoRaw.value.trim() !== '' && validarMonto(montoRaw.value) === ''
)


const validarEnTiempoReal = () => {
  
  errorLocal.value = montoRaw.value.trim()
    ? validarMonto(montoRaw.value)
    : ''
}


watch(() => props.show, (v) => {
  if (v) {
    montoRaw.value   = ''
    errorLocal.value = ''
  }
})

const confirmar = () => {
  
  const err = validarMonto(montoRaw.value)
  if (err) { errorLocal.value = err; return }
  errorLocal.value = ''
  emit('confirm', parseFloat(montoRaw.value))
}
</script>

<style scoped>
.modal {
  display: flex; position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.9);
  justify-content: center; align-items: center;
  z-index: 1000; backdrop-filter: blur(5px);
}

.modal-content {
  background: #ffffff; padding: 30px; border-radius: 20px;
  max-width: 480px; width: 90%;
  border-top: 8px solid #ff0000; border-bottom: 8px solid #ff0000;
  animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideIn {
  from { transform: translateY(-30px) scale(0.95); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}

.modal-content h3 {
  color: #000; font-size: 24px; margin-bottom: 20px;
  padding-bottom: 10px; border-bottom: 3px solid #ff0000;
  display: flex; align-items: center; gap: 10px;
}

.usuario-info {
  background: #f8f9fa; padding: 15px; border-radius: 10px;
  margin-bottom: 20px; border-left: 5px solid #ff0000;
}
.usuario-info p      { margin: 5px 0; color: #000; }
.usuario-info strong { color: #ff0000; }

.modal-hint { color: #666; margin-bottom: 12px; font-size: 15px; }


.input-wrapper { position: relative; margin-bottom: 10px; }

.monto-input {
  width: 100%; padding: 14px 46px 14px 14px; font-size: 20px;
  border: 2px solid #e0e0e0; border-radius: 10px;
  outline: none; transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}
.monto-input:focus       { border-color: #ff0000; box-shadow: 0 0 0 3px rgba(255,0,0,0.1); }
.monto-input.input-error { border-color: #ff0000; background: #fff5f5; }
.monto-input.input-valid { border-color: #22c55e; background: #f0fdf4; box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }


.input-icon {
  position: absolute; right: 14px; top: 50%;
  transform: translateY(-50%); font-size: 20px; pointer-events: none;
}
.icon-ok  { color: #22c55e; }
.icon-err { color: #ff0000; }


.modal-error,
.modal-success {
  padding: 10px 15px; border-radius: 8px;
  font-size: 13px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 15px;
}
.modal-error   { background: #fff0f0; border: 1px solid #ff0000; color: #cc0000; }
.modal-success { background: #f0fdf4; border: 1px solid #22c55e; color: #15803d; }


.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; transform: translateY(-4px); }

.modal-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.modal-btn {
  padding: 15px; border: none; border-radius: 50px;
  font-weight: 700; cursor: pointer; transition: all 0.3s;
  text-transform: uppercase; font-size: 14px; letter-spacing: 1px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.modal-btn.primary   { background: #ff0000; color: #fff; }
.modal-btn.secondary { background: #000; color: #fff; }
.modal-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255,0,0,0.3); }
.modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>