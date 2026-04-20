<template>
  <div v-if="show" class="modal" @click.self="$emit('close')">
    <div class="modal-content">

      <div class="modal-header">
        <h3>
          <i class="fas fa-plus-circle"></i>
          NUEVO INGREDIENTE
        </h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="product-form">

        <div class="form-group">
          <label for="nombre">
            <i class="fas fa-leaf"></i> Nombre del ingrediente
            <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <input
              id="nombre"
              type="text"
              v-model="form.nombre"
              placeholder="Ej: Mozzarella extra"
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
          <label for="precio_extra">
            <i class="fas fa-dollar-sign"></i> Precio extra base (Bs)
            <span class="required">*</span>
            <span class="badge-tooltip" title="Precio por defecto sin tamaño específico">?</span>
          </label>
          <div class="input-prefix" :class="{
            'prefix-error': campoConError('precio_extra'),
            'prefix-valid': campoValido('precio_extra', String(form.precio_extra))
          }">
            <span class="prefix">Bs</span>
            <input
              id="precio_extra"
              type="text"
              v-model="form.precio_extra"
              placeholder="0.00"
              @input="validarPrecio('precio_extra', String(form.precio_extra))"
            />
            <span v-if="touched.precio_extra" class="input-icon-prefix">
              <i class="fas"
                :class="!errors.precio_extra ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
              ></i>
            </span>
          </div>
          <transition name="fade">
            <span v-if="errors.precio_extra" class="field-error">
              <i class="fas fa-exclamation-triangle"></i> {{ errors.precio_extra }}
            </span>
          </transition>
          <p class="hint-text">
            <i class="fas fa-info-circle"></i>
            Este es el precio extra que se aplica cuando no hay un tamaño específico.
          </p>
        </div>

        <div class="section-block">
          <div class="section-title">
            <i class="fas fa-ruler-combined"></i>
            Precio extra por tamaño
            <span class="optional-label">(opcional)</span>
          </div>

          <p class="hint-text" style="margin-top: -4px;">
            <i class="fas fa-info-circle"></i>
            Define un precio extra diferente según el tamaño de pizza. Deja en 0 si no aplica.
          </p>

          <div class="tamanos-grid">
            <div
              v-for="tamano in TAMANOS"
              :key="tamano.id"
              class="tamano-card"
              :class="{ active: Number(form.preciosTamano[tamano.id]) > 0 }"
            >
              <div class="tamano-header">
                <span class="tamano-icon">{{ tamano.emoji }}</span>
                <span class="tamano-label">{{ tamano.nombre }}</span>
              </div>
              <div
                class="input-prefix small"
                :class="{
                  'prefix-error': campoConError(`tamano_${tamano.id}`),
                  'prefix-valid': campoValido(`tamano_${tamano.id}`, form.preciosTamano[tamano.id] ?? 0)
                }"
              >
                <span class="prefix">Bs</span>
                <input
                  type="number"
                  v-model.number="form.preciosTamano[tamano.id]"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  @input="validarTamanoPrecio(tamano.id)"
                />
                <span v-if="touched[`tamano_${tamano.id}`]" class="input-icon-prefix">
                  <i class="fas"
                    :class="!errors[`tamano_${tamano.id}`] ? 'fa-check-circle icon-ok' : 'fa-times-circle icon-err'"
                  ></i>
                </span>
              </div>
              <transition name="fade">
                <span v-if="errors[`tamano_${tamano.id}`]" class="field-error">
                  <i class="fas fa-exclamation-triangle"></i> {{ errors[`tamano_${tamano.id}`] }}
                </span>
              </transition>
            </div>
          </div>

          <div v-if="tamañosConfigurados.length > 0" class="selected-summary">
            <span class="selected-count">
              <i class="fas fa-check-circle"></i>
              {{ tamañosConfigurados.length }} tamaño(s) con precio configurado
            </span>
            <button type="button" class="clear-btn" @click="limpiarTamanos">
              <i class="fas fa-undo-alt"></i> Limpiar
            </button>
          </div>
        </div>

        <div class="form-group form-group--checkbox">
          <label class="checkbox-label">
            <div class="toggle-switch">
              <input type="checkbox" v-model="form.activo" id="activo" />
              <span class="toggle-slider"></span>
            </div>
            <div class="checkbox-text">
              <span class="checkbox-title">Ingrediente activo</span>
              <span class="checkbox-sub">
                {{ form.activo ? 'Disponible para agregar a productos' : 'Deshabilitado' }}
              </span>
            </div>
          </label>
        </div>

        <div class="modal-buttons">
          <button type="submit" class="modal-btn primary" :disabled="loading || !formularioValido">
            <i class="fas" :class="loading ? 'fa-spinner fa-spin' : 'fa-plus'"></i>
            {{ loading ? 'GUARDANDO...' : 'CREAR INGREDIENTE' }}
          </button>
          <button type="button" class="modal-btn secondary" :disabled="loading" @click="$emit('close')">
            <i class="fas fa-times"></i>
            CANCELAR
          </button>
        </div>

        <div v-if="serverError" class="form-error">
          {{ serverError }}
        </div>

      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStoreIngredientes } from '@/stores/productos/ingredientes'
import { useValidacion, REGEX } from '@/composables/useValidacion'
import type { IngredientePayload, IngredienteTamanoPayload } from '@/services/ingrediente_service'

const props = defineProps<{ show: boolean }>()
const emit  = defineEmits<{ close: [] }>()

const ingredientesStore = useStoreIngredientes()

const { errors, touched, validarPrecio, validarCampo, validarLista, campoConError, campoValido, resetValidacion } = useValidacion()

const TAMANOS = [
  { id: 1, nombre: 'Pequeña',  emoji: '🍕' },
  { id: 2, nombre: 'Mediana',  emoji: '🍕' },
  { id: 3, nombre: 'Familiar', emoji: '🍕' },
  { id: 4, nombre: 'Grande',   emoji: '🍕' },
] as const

const defaultForm = () => ({
  nombre:        '',
  precio_extra:  '' as string | number,
  activo:        true,
  preciosTamano: { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>,
})

const form        = ref(defaultForm())
const loading     = ref(false)
const serverError = ref('')

const tamañosConfigurados = computed(() =>
  TAMANOS.filter(t => Number(form.value.preciosTamano[t.id]) > 0)
)

const formularioValido = computed(() => {
  const nombreOk = REGEX.nombre.test(form.value.nombre.trim())
  const precioOk = REGEX.precio_extra.test(String(form.value.precio_extra).trim()) &&
                  Number(form.value.precio_extra) >= 0
  const sinErrores = Object.values(errors.value).every(e => !e)
  return nombreOk && precioOk && sinErrores
})

function limpiarTamanos() {
  form.value.preciosTamano = { 1: 0, 2: 0, 3: 0, 4: 0 }
}

function validarTamanoPrecio(tamanoId: number) {
  const campo = `tamano_${tamanoId}`
  const precio = form.value.preciosTamano[tamanoId] ?? 0
  validarPrecio(campo, precio, 500, false)
  validarTamanos()
}

function validarTamanos() {
  let valido = false

  for (const tamano of TAMANOS) {
    const campo = `tamano_${tamano.id}`
    const precio = form.value.preciosTamano[tamano.id] ?? 0

    validarPrecio(campo, precio, 500, false)
    if (Number(precio) > 0) valido = true
  }

  return validarLista('tamanos', valido ? ['ok'] : [], 'Ingresa el precio de al menos un tamaño.')
}

watch(() => props.show, (visible) => {
  if (visible) {
    form.value        = defaultForm()
    serverError.value = ''
    resetValidacion()
  }
})

const handleSubmit = async () => {
  validarCampo('nombre',       form.value.nombre)
  validarCampo('precio_extra', String(form.value.precio_extra))
  if (!formularioValido.value) return

  const payload: IngredientePayload = {
    nombre:       form.value.nombre.trim(),
    precio_extra: Number(form.value.precio_extra),
    activo:       form.value.activo,
  }

  loading.value     = true
  serverError.value = ''

  try {
    const newIngrediente = await ingredientesStore.agregarIngrediente(payload)

    if (!newIngrediente) {
      serverError.value = ingredientesStore.error || 'No se pudo crear el ingrediente'
      return
    }

    for (const tamano of TAMANOS) {
      const precio = Number(form.value.preciosTamano[tamano.id])
      if (precio > 0) {
        const tamanoPayload: IngredienteTamanoPayload = {
          ingrediente_id: newIngrediente.id,
          tamano_id:      tamano.id,
          precio_extra:   precio,
        }
        await ingredientesStore.agregarIngredienteTamano(tamanoPayload)
      }
    }

    emit('close')

  } catch {
    serverError.value = 'Error de servidor al crear el ingrediente'
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

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: #000;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.form-group label i { color: #ff0000; font-size: 13px; }

.required { color: #ff0000; font-size: 15px; font-weight: 800; }

.optional-label {
  color: #999;
  font-weight: 400;
  font-size: 12px;
  margin-left: 4px;
}

.badge-tooltip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px; height: 16px;
  background: #e0e0e0;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  color: #666;
  cursor: help;
  margin-left: 2px;
}

.input-wrapper { position: relative; }

.input-icon {
  position: absolute;
  right: 12px; top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  pointer-events: none;
}

.form-group input[type="text"],
.form-group input[type="number"] {
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

.form-group input.input-error {
  border-color: #ff0000;
  background: #fff5f5;
}

.form-group input.input-valid {
  border-color: #22c55e;
  background: #f0fdf4;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.input-prefix {
  display: flex;
  align-items: center;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
  transition: all 0.25s;
  position: relative;
}

.input-prefix:focus-within {
  border-color: #ff0000;
  box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
  background: #fff;
}

.input-prefix.prefix-error {
  border-color: #ff0000;
  background: #fff5f5;
}

.input-prefix.prefix-valid {
  border-color: #22c55e;
  background: #f0fdf4;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.prefix {
  padding: 10px 12px;
  background: #ff0000;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  min-width: 45px;
  text-align: center;
  flex-shrink: 0;
}

.input-prefix input {
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  flex: 1;
  background: transparent;
  padding: 10px 36px 10px 8px !important;
  width: 100%;
  text-align: right;
  font-size: 14px;
  font-family: 'Montserrat', sans-serif;
}

.input-prefix input:focus {
  border: none;
  box-shadow: none;
  outline: none;
}

.input-icon-prefix {
  position: absolute;
  right: 10px;
  font-size: 16px;
  pointer-events: none;
}

.input-prefix.small { border-radius: 6px; }
.input-prefix.small .prefix { padding: 6px 8px; font-size: 11px; min-width: 35px; }
.input-prefix.small input   { padding: 6px 6px !important; font-size: 12px; }

.icon-ok  { color: #22c55e; }
.icon-err { color: #ff0000; }

.field-error {
  color: #cc0000;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; transform: translateY(-4px); }

.section-block {
  background: #fafafa;
  border: 2px solid #e8e8e8;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  font-weight: 800;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #000;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title i { color: #ff0000; }

.tamanos-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tamano-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 12px 10px;
  transition: all 0.2s ease;
  min-width: 0;
}

.tamano-card:focus-within,
.tamano-card.active {
  border-color: #ff0000;
  box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.08);
}

.tamano-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.tamano-icon  { font-size: 20px; line-height: 1; }

.tamano-label {
  font-size: 12px;
  font-weight: 700;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.tamano-card.active .tamano-label { color: #ff0000; }
.tamano-card .input-prefix        { width: 100%; }
.tamano-card .input-prefix input  { text-align: right; }

.selected-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(to right, #fff5f5, #ffffff);
  border: 1px solid #ffcdcd;
  border-radius: 10px;
  margin-top: 8px;
}

.selected-count {
  font-size: 12px;
  font-weight: 600;
  color: #cc0000;
  display: flex;
  align-items: center;
  gap: 6px;
}

.selected-count i { font-size: 14px; color: #ff0000; }

.clear-btn {
  font-size: 11px;
  font-weight: 600;
  color: #ff0000;
  background: rgba(255, 0, 0, 0.05);
  border: 1px solid #ffcdcd;
  border-radius: 20px;
  padding: 4px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  font-family: 'Montserrat', sans-serif;
}

.clear-btn:hover { background: #ff0000; color: white; border-color: #ff0000; }
.clear-btn i     { font-size: 10px; }

.hint-text {
  font-size: 11px;
  color: #888;
  display: flex;
  align-items: flex-start;
  gap: 5px;
  line-height: 1.4;
}
.hint-text i { color: #ff0000; margin-top: 1px; flex-shrink: 0; }

.form-group--checkbox { margin-top: 4px; }

.checkbox-label {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 14px;
  cursor: pointer;
}

.toggle-switch {
  position: relative;
  width: 52px; height: 28px;
  flex-shrink: 0;
}

.toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }

.toggle-slider {
  position: absolute;
  inset: 0;
  background: #ccc;
  border-radius: 28px;
  transition: background 0.3s;
  cursor: pointer;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px; height: 20px;
  left: 4px; top: 4px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.toggle-switch input:checked + .toggle-slider         { background: #ff0000; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(24px); }

.checkbox-text  { display: flex; flex-direction: column; gap: 2px; }
.checkbox-title { font-weight: 700; font-size: 14px; color: #000; }
.checkbox-sub   { font-size: 12px; color: #888; }

.modal-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
}

.modal-btn {
  padding: 14px;
  border: none; border-radius: 50px;
  font-weight: 700; font-size: 14px;
  cursor: pointer; transition: all 0.25s;
  text-transform: uppercase;
  font-family: 'Montserrat', sans-serif;
  letter-spacing: 0.5px;
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
  margin-top: 4px;
  color: #ff3333;
  font-weight: 600;
  text-align: center;
  font-size: 13px;
}

::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }

@media (max-width: 480px) {
  .modal-content { border-radius: 16px; }
  .product-form  { padding: 20px; }
  .modal-buttons { grid-template-columns: 1fr; }
}
</style>