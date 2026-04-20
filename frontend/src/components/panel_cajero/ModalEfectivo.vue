<template>
  <div v-if="show" class="modal" @click.self="$emit('close')">
    <div class="modal-content">
      <h3><i class="fas fa-money-bill-wave" style="color:#ff0000;"></i> PAGO EN EFECTIVO</h3>

      <div v-if="clienteNombre" class="cliente-resumen">
        <p><strong>Cliente:</strong> {{ clienteNombre }}</p>
      </div>

      <p class="total-label">
        Total a cobrar:
        <strong class="total-monto">Bs {{ total.toFixed(2) }}</strong>
      </p>

      <div class="input-group">
        <label class="input-label">Monto recibido</label>
        <input
          type="number"
          v-model.number="montoLocal"
          placeholder="0.00"
          step="0.01" min="0"
          class="monto-input"
          ref="inputRef"
          @keyup.enter="confirmar"
        />
      </div>

      <div class="cambio-box" :class="{ 'cambio-ok': cambio >= 0, 'cambio-error': cambio < 0 }">
        <span>Cambio a entregar:</span>
        <strong>Bs {{ Math.max(0, cambio).toFixed(2) }}</strong>
      </div>

      <div v-if="montoLocal > 0 && montoLocal < total" class="aviso-insuficiente">
        <i class="fas fa-exclamation-triangle"></i>
        Monto insuficiente — faltan Bs {{ (total - montoLocal).toFixed(2) }}
      </div>

      <div class="modal-buttons">
        <button
          class="modal-btn primary"
          @click="confirmar"
          :disabled="cargando || montoLocal <= 0 || montoLocal < total"
        >
          <i class="fas" :class="cargando ? 'fa-spinner fa-spin' : 'fa-check'"></i>
          {{ cargando ? 'PROCESANDO...' : 'CONFIRMAR' }}
        </button>
        <button class="modal-btn secondary" @click="$emit('close')" :disabled="cargando">
          CANCELAR
        </button>
      </div>

      <div v-if="error" class="modal-error">
        <i class="fas fa-exclamation-triangle"></i> {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  show:          boolean
  total:         number
  clienteNombre: string
  cargando:      boolean
  error:         string | null
}>()

const emit = defineEmits<{
  (e: 'close'):                   void
  (e: 'confirm', monto: number):  void
}>()

const montoLocal = ref<number>(0)
const inputRef   = ref<HTMLInputElement | null>(null)

const cambio = computed(() => (montoLocal.value || 0) - props.total)


watch(() => props.show, async (v) => {
  if (v) {
    montoLocal.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

const confirmar = () => {
  if (montoLocal.value < props.total) return
  emit('confirm', montoLocal.value)
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
  max-width: 460px; width: 90%;
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

.cliente-resumen {
  background: #f8f9fa; padding: 12px 15px; border-radius: 10px;
  margin-bottom: 15px; border-left: 5px solid #ff0000;
}
.cliente-resumen p      { margin: 0; color: #000; }
.cliente-resumen strong { color: #ff0000; }

.total-label {
  font-size: 16px; color: #444; margin-bottom: 18px;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.total-monto { color: #ff0000; font-size: 26px; }

.input-group  { margin-bottom: 15px; }
.input-label  { display: block; font-size: 13px; font-weight: 600; color: #666; margin-bottom: 6px; }

.monto-input {
  width: 100%; padding: 14px; font-size: 22px;
  border: 2px solid #e0e0e0; border-radius: 10px;
  outline: none; transition: border-color 0.2s; text-align: right;
}
.monto-input:focus { border-color: #ff0000; box-shadow: 0 0 0 3px rgba(255,0,0,0.1); }

.cambio-box {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; border-radius: 10px; margin-bottom: 12px;
  font-size: 18px; font-weight: 600;
}
.cambio-box.cambio-ok    { background: #e8f5e9; color: #2e7d32; }
.cambio-box.cambio-error { background: #ffeaea; color: #c62828; }
.cambio-box strong       { font-size: 22px; }

.aviso-insuficiente {
  background: #fff3cd; border: 1px solid #ffc107;
  border-radius: 8px; padding: 10px 14px;
  color: #856404; font-size: 13px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 14px;
}

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

.modal-error {
  margin-top: 12px; padding: 10px 15px;
  background: #fff0f0; border: 1px solid #ff0000;
  border-radius: 8px; color: #cc0000;
  font-size: 13px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}
</style>