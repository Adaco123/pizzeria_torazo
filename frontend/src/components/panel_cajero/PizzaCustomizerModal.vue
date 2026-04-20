<template>
  <div v-if="show" class="modal" @click.self="emit('close')">
    <div class="modal-content">
      <h3>Personalizar {{ pizza?.nombre }}</h3>

      
      <div class="size-selector">
        <div class="size-title">
          Selecciona el tamaño:
          <span v-if="tamanosBloqueados" class="size-locked-hint">
            Reduce la cantidad a 1 para cambiar el tamaño
          </span>
        </div>
        <div v-if="productosStore.loading.fetch" style="text-align:center;padding:15px;color:#999;">
          Cargando tamaños...
        </div>
        <div v-else class="size-options">
          <div
            v-for="tamano in tamanosDeLaPizza"
            :key="tamano.tamano_id"
            class="size-option"
            :class="{
              selected: selectedSizeId === tamano.tamano_id,
              locked: tamanosBloqueados && selectedSizeId !== tamano.tamano_id
            }"
            @click="seleccionarTamano(tamano.tamano_id)"
          >
            <div class="size-name">{{ tamano.tamano }}</div>
            <div class="size-price">Bs {{ tamano.precio.toFixed(2) }}</div>
            <div v-if="tamanosBloqueados && selectedSizeId !== tamano.tamano_id" class="lock-icon"></div>
          </div>
        </div>
      </div>

      
      <div class="extras-show-button">
        <button class="show-extras-btn" @click="showExtras = true">
          <i class="fas fa-plus-circle"></i> VER EXTRAS DISPONIBLES
        </button>
      </div>

      
      <div v-if="extrasSeleccionadosConPrecio.length > 0" class="selected-extras-summary">
        <div class="section-subtitle">Extras seleccionados:</div>
        <div
          v-for="extra in extrasSeleccionadosConPrecio"
          :key="extra.id"
          class="selected-extra-item"
        >
          <span class="selected-extra-name">{{ extra.nombre }}</span>
          <span class="selected-extra-price">+Bs {{ extra.precio_para_tamano.toFixed(2) }}</span>
          <button class="remove-extra" @click="quitarExtra(extra.id)">✕</button>
        </div>
      </div>

      
      <div v-if="showExtras" class="extras-modal" @click.self="showExtras = false">
        <div class="extras-modal-content">
          <div class="extras-modal-header">
            <h4>Extras Disponibles</h4>
            <button class="close-btn" @click="showExtras = false">✕</button>
          </div>
          <div class="extras-list">
            <div v-if="ingredientesStore.loading.fetch"
                 style="text-align:center;padding:20px;color:#999;">
              Cargando extras...
            </div>
            <template v-else>
              <div
                v-for="ing in extrasDisponibles"
                :key="ing.id"
                class="extra-select-item"
              >
                <input
                  type="checkbox"
                  :id="`extra_${ing.id}`"
                  :checked="!!extrasSeleccionados[ing.id]"
                  @change="toggleExtra(ing)"
                />
                <div class="extra-select-details">
                  <span class="extra-select-name">{{ ing.nombre }}</span>
                  <span class="extra-select-price">
                    +Bs {{ ing.precio_para_tamano.toFixed(2) }}
                  </span>
                </div>
              </div>
            </template>
          </div>
          <div class="extras-modal-footer">
            <button class="modal-btn primary" @click="showExtras = false">ACEPTAR</button>
          </div>
        </div>
      </div>

      
      <div class="quantity-selector">
        <button class="quantity-btn" @click="cantidad = Math.max(1, cantidad - 1)">-</button>
        <span class="quantity-display">{{ cantidad }}</span>
        <button class="quantity-btn" @click="cantidad++">+</button>
      </div>

      
      <div class="special-request">
        <div class="section-subtitle">Instrucciones especiales:</div>
        <textarea
          v-model="instrucciones"
          rows="3"
          placeholder="Ej: Sin cebolla, poco horneado, etc..."
        />
      </div>

      
      <div class="modal-total">
        Total: <span>Bs {{ totalModal.toFixed(2) }}</span>
      </div>

      
      <div class="modal-buttons">
        <button
          class="modal-btn primary"
          @click="agregarAlCarrito"
          :disabled="!tamanoSeleccionado"
        >
          <i class="fas fa-cart-plus"></i> AGREGAR
        </button>
        <button class="modal-btn secondary" @click="emit('close')">CANCELAR</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch }  from 'vue'
import { useStoreProductos }     from '@/stores/productos/productos'
import { useStoreIngredientes }  from '@/stores/productos/ingredientes'
import type { Producto }         from '@/services/producto_service'
import type { Ingrediente }      from '@/services/ingrediente_service'


const productosStore    = useStoreProductos()
const ingredientesStore = useStoreIngredientes()


const props = defineProps<{
  show:  boolean
  pizza: Producto | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add-to-cart', item: object): void
}>()


const selectedSizeId      = ref<number | null>(null)
const extrasSeleccionados = ref<Record<number, Ingrediente>>({})
const cantidad            = ref(1)
const instrucciones       = ref('')
const showExtras          = ref(false)




const tamanosBloqueados = computed(() => cantidad.value > 1)

const seleccionarTamano = (tamanoId: number) => {
  if (tamanosBloqueados.value) return
  selectedSizeId.value = tamanoId
}


const tamanosDeLaPizza = computed(() =>
  props.pizza
    ? [...productosStore.tamanos_producto].sort((a, b) => a.precio - b.precio)
    : []
)

const tamanoSeleccionado = computed(() =>
  tamanosDeLaPizza.value.find(t => t.tamano_id === selectedSizeId.value) ?? null
)



const getPrecioExtraPorTamano = (ing: Ingrediente): number => {
  if (!selectedSizeId.value) return ing.precio_extra

  const config = ingredientesStore.ingredientes_tamanos.find(
    it => it.ingrediente_id === ing.id && it.tamano_id === selectedSizeId.value
  )
  return config?.precio_extra ?? ing.precio_extra
}


const extrasDisponibles = computed(() =>
  ingredientesStore.conPrecioExtra.map(ing => ({
    ...ing,
    precio_para_tamano: getPrecioExtraPorTamano(ing)
  }))
)


const extrasSeleccionadosConPrecio = computed(() =>
  Object.values(extrasSeleccionados.value).map(ing => ({
    ...ing,
    precio_para_tamano: getPrecioExtraPorTamano(ing)
  }))
)

const totalModal = computed(() => {
  if (!tamanoSeleccionado.value) return 0
  const extrasSum = extrasSeleccionadosConPrecio.value
    .reduce((s, e) => s + e.precio_para_tamano, 0)
  return (tamanoSeleccionado.value.precio + extrasSum) * cantidad.value
})


watch(() => props.show, async (abierto) => {
  if (!abierto || !props.pizza) return

  
  selectedSizeId.value      = null
  extrasSeleccionados.value = {}
  cantidad.value            = 1
  instrucciones.value       = ''
  showExtras.value          = false

  
  await Promise.all([
    productosStore.fetchTamanosProducto(props.pizza.id),
    ingredientesStore.fetchIngredientes(),
    ingredientesStore.fetchIngredientesTamanos(),
  ])

  
  if (tamanosDeLaPizza.value.length > 0) {
    selectedSizeId.value = tamanosDeLaPizza.value[0].tamano_id
  }
})


const toggleExtra = (ing: Ingrediente) => {
  if (extrasSeleccionados.value[ing.id]) {
    delete extrasSeleccionados.value[ing.id]
  } else {
    extrasSeleccionados.value[ing.id] = ing
  }
  
  extrasSeleccionados.value = { ...extrasSeleccionados.value }
}

const quitarExtra = (id: number) => {
  delete extrasSeleccionados.value[id]
  extrasSeleccionados.value = { ...extrasSeleccionados.value }
}


const agregarAlCarrito = () => {
  if (!tamanoSeleccionado.value || !props.pizza) return

  const extrasSum = extrasSeleccionadosConPrecio.value
    .reduce((s, e) => s + e.precio_para_tamano, 0)

  const unitPrice = tamanoSeleccionado.value.precio + extrasSum

  emit('add-to-cart', {
    id:                  Date.now(),
    name:                props.pizza.nombre,
    size:                tamanoSeleccionado.value.tamano,
    tamano_id:           tamanoSeleccionado.value.tamano_id,  
    unitPrice,
    
    extras: extrasSeleccionadosConPrecio.value.map(e => ({
      ingrediente_id: e.id,                    
      nombre:         e.nombre,
      precio_extra:   e.precio_para_tamano,
      cantidad:       1,
      tamano_id:      selectedSizeId.value,
    })),
    excludedIngredients: [],
    specialInstructions: instrucciones.value,
    quantity:            cantidad.value,
    totalPrice:          unitPrice * cantidad.value,
    type:                'pizza'
  })

  emit('close')
}
</script>

<style scoped>
.modal {
  display: flex;
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.9);
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: #ffffff;
  padding: 30px;
  border-radius: 20px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border-top: 8px solid #ff0000;
  border-bottom: 8px solid #ff0000;
}

.modal-content h3 {
  color: #000000;
  font-size: 24px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 3px solid #ff0000;
}

.size-selector { margin-bottom: 25px; }
.size-title { color: #000; font-weight: 700; margin-bottom: 10px; }


.size-locked-hint {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #ff0000;
  margin-top: 5px;
}

.size-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }

.size-option {
  background: #f5f5f5;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  padding: 15px 5px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}


.size-option.selected {
  border-color: #ff0000;
  background: #ff0000;
  color: #fff;
}
.size-option.selected .size-price { color: #fff; }
.size-option.selected .size-name  { color: #fff; }


.size-option.locked {
  opacity: 0.4;
  cursor: not-allowed;
  background: #e0e0e0;
  border-color: #ccc;
  pointer-events: none;
}

.lock-icon {
  font-size: 12px;
  margin-top: 4px;
}

.size-name  { color: black; font-weight: 700; font-size: 16px; margin-bottom: 5px; }
.size-price { color: #ff0000; font-weight: 800; font-size: 14px; }


.extras-show-button {
  margin-bottom: 15px;
  text-align: center;
}

.show-extras-btn {
  background: #000;
  color: white;
  border: 2px solid #ff0000;
  padding: 15px 20px;
  border-radius: 50px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.show-extras-btn:hover {
  background: #ff0000;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255,0,0,0.3);
}


.selected-extras-summary {
  margin-bottom: 25px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 10px;
  border: 2px solid #ff0000;
}

.section-subtitle { color: #000; font-weight: 700; margin-bottom: 15px; font-size: 18px; }

.selected-extra-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.selected-extra-item:last-child {
  border-bottom: none;
}

.selected-extra-name {
  flex: 1;
  color: #000;
  font-weight: 600;
}

.selected-extra-price {
  color: #ff0000;
  font-weight: 700;
  margin-right: 10px;
}

.remove-extra {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 0 5px;
}

.remove-extra:hover {
  color: #ff0000;
}


.extras-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
  backdrop-filter: blur(3px);
}

.extras-modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  border-top: 5px solid #ff0000;
  border-bottom: 5px solid #ff0000;
  overflow: hidden;
}

.extras-modal-header {
  background: #000;
  color: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.extras-modal-header h4 {
  margin: 0;
  font-size: 18px;
  color: #ff0000;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0 5px;
}

.close-btn:hover {
  color: #ff0000;
}

.extras-list {
  padding: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.extra-select-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.extra-select-item:last-child {
  border-bottom: none;
}

.extra-select-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #ff0000;
}

.extra-select-details {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.extra-select-name {
  color: #000;
  font-weight: 600;
}

.extra-select-price {
  color: #ff0000;
  font-weight: 700;
}

.extras-modal-footer {
  padding: 15px 20px;
  background: #f5f5f5;
  text-align: center;
}

.extras-modal-footer .modal-btn {
  padding: 10px 30px;
  width: auto;
}

.quantity-selector {
  display: flex; align-items: center; justify-content: center;
  gap: 15px; margin-bottom: 25px;
  background: #f5f5f5; padding: 15px; border-radius: 10px;
}

.quantity-btn {
  background: #000; color: #fff; border: none;
  width: 40px; height: 40px; border-radius: 50%;
  font-size: 20px; font-weight: 700; cursor: pointer; transition: all 0.3s;
}

.quantity-btn:hover { background: #ff0000; }

.quantity-display { font-size: 24px; font-weight: 700; color: #000; min-width: 50px; text-align: center; }

.special-request { margin-bottom: 25px; }

.special-request textarea {
  width: 100%; padding: 12px;
  border: 2px solid #e0e0e0; border-radius: 10px;
  font-family: inherit; resize: vertical;
}

.special-request textarea:focus { outline: none; border-color: #ff0000; }

.modal-total {
  background: #000; color: #fff;
  padding: 15px; border-radius: 10px;
  text-align: right; margin-bottom: 20px;
  font-size: 20px; font-weight: 700;
}

.modal-total span { color: #ff0000; font-size: 24px; margin-left: 10px; }

.modal-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.modal-btn {
  padding: 15px; border: none; border-radius: 50px;
  font-weight: 700; cursor: pointer; transition: all 0.3s; text-transform: uppercase;
}

.modal-btn.primary   { background: #ff0000; color: #fff; }
.modal-btn.secondary { background: #000; color: #fff; }
.modal-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255,0,0,0.3); }

::-webkit-scrollbar       { width: 8px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #cc0000; }

@media (max-width: 768px) {
  .size-options { grid-template-columns: repeat(2, 1fr); }
}
</style>