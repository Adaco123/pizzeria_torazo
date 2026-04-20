<template>
  <div v-if="show" class="modal" @click.self="emit('close')">
    <div class="modal-content">
      <h3><i class="fas fa-pizza-slice"></i> PIZZA MITAD / MITAD</h3>

      
      <div class="section">
        <div class="section-title">Selecciona el tamaño:</div>
        <div v-if="tamanosStore.loading.fetch" style="text-align:center;padding:10px;color:#999;">
          Cargando tamaños...
        </div>
        <div v-else class="size-options">
          <div
            v-for="tamano in tamanosStore.tamanos"
            :key="tamano.id"
            class="size-option"
            :class="{ selected: selectedTamanoId === tamano.id }"
            @click="seleccionarTamano(tamano.id)"
          >
            <div class="size-name">{{ tamano.nombre }}</div>
          </div>
        </div>
      </div>

      
      <div class="mitades-grid">

        
        <div class="mitad-panel" :class="{ completa: mitad1.producto_id }">
          <div class="mitad-header">🍕 MITAD 1</div>

          <select v-model="mitad1.producto_id" class="pizza-select" @change="onChangeMitad(1)">
            <option :value="null" disabled>Selecciona una pizza...</option>
            <option v-for="p in pizzas" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>

          <div v-if="mitad1.producto_id && selectedTamanoId" class="mitad-precio">
            Bs {{ getPrecioMitad(mitad1.producto_id).toFixed(2) }}
          </div>

          <div v-if="mitad1.producto_id" class="extras-section">
            <button class="show-extras-btn" @click="abrirExtras(1)">
              <i class="fas fa-plus-circle"></i> EXTRAS
              <span v-if="mitad1.extras.length" class="extras-badge">
                {{ mitad1.extras.length }}
              </span>
            </button>
            <div v-if="mitad1.extras.length" class="extras-resumen">
              <span
                v-for="extra in mitad1.extras"
                :key="extra.ingrediente_id"
                class="extra-tag"
              >
                {{ extra.nombre }}
                <button @click="quitarExtra(1, extra.ingrediente_id)">✕</button>
              </span>
            </div>
          </div>
        </div>

        <div class="mitad-divider">VS</div>

        
        <div class="mitad-panel" :class="{ completa: mitad2.producto_id }">
          <div class="mitad-header">🍕 MITAD 2</div>

          <select v-model="mitad2.producto_id" class="pizza-select" @change="onChangeMitad(2)">
            <option :value="null" disabled>Selecciona una pizza...</option>
            <option v-for="p in pizzas" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>

          <div v-if="mitad2.producto_id && selectedTamanoId" class="mitad-precio">
            Bs {{ getPrecioMitad(mitad2.producto_id).toFixed(2) }}
          </div>

          <div v-if="mitad2.producto_id" class="extras-section">
            <button class="show-extras-btn" @click="abrirExtras(2)">
              <i class="fas fa-plus-circle"></i> EXTRAS
              <span v-if="mitad2.extras.length" class="extras-badge">
                {{ mitad2.extras.length }}
              </span>
            </button>
            <div v-if="mitad2.extras.length" class="extras-resumen">
              <span
                v-for="extra in mitad2.extras"
                :key="extra.ingrediente_id"
                class="extra-tag"
              >
                {{ extra.nombre }}
                <button @click="quitarExtra(2, extra.ingrediente_id)">✕</button>
              </span>
            </div>
          </div>
        </div>
      </div>

      
      <div class="quantity-selector">
        <button class="quantity-btn" @click="cantidad = Math.max(1, cantidad - 1)">-</button>
        <span class="quantity-display">{{ cantidad }}</span>
        <button class="quantity-btn" @click="cantidad++">+</button>
      </div>

      
      <div class="modal-total">
        Total: <span>Bs {{ totalModal.toFixed(2) }}</span>
      </div>

      
      <div v-if="errorMsg" class="error-msg">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMsg }}
      </div>

      
      <div class="modal-buttons">
        <button
          class="modal-btn primary"
          @click="agregarAlCarrito"
          :disabled="!puedeAgregar"
        >
          <i class="fas fa-cart-plus"></i> AGREGAR
        </button>
        <button class="modal-btn secondary" @click="emit('close')">CANCELAR</button>
      </div>
    </div>

    
    <div v-if="showExtrasModal" class="extras-modal" @click.self="showExtrasModal = false">
      <div class="extras-modal-content">
        <div class="extras-modal-header">
          <h4>Extras — Mitad {{ mitadActivaExtras }}</h4>
          <button class="close-btn" @click="showExtrasModal = false">✕</button>
        </div>
        <div class="extras-list">
          <div v-if="ingredientesStore.loading.fetch"
               style="text-align:center;padding:20px;color:#999;">
            Cargando extras...
          </div>
          <template v-else>
            <div
              v-for="ing in ingredientesStore.conPrecioExtra"
              :key="ing.id"
              class="extra-select-item"
            >
              <input
                type="checkbox"
                :id="`extra_mitad_${ing.id}`"
                :checked="estaSeleccionado(ing.id)"
                @change="toggleExtra(ing)"
              />
              <div class="extra-select-details">
                <span class="extra-select-name">{{ ing.nombre }}</span>
                <span class="extra-select-price">
                  +Bs {{ getPrecioExtra(ing.id).toFixed(2) }}
                </span>
              </div>
            </div>
          </template>
        </div>
        <div class="extras-modal-footer">
          <button class="modal-btn primary" @click="showExtrasModal = false">ACEPTAR</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStoreProductos }    from '@/stores/productos/productos'
import { useStoreIngredientes } from '@/stores/productos/ingredientes'
import { useStoreTamanos }      from '@/stores/productos/tamanos'
import type { Ingrediente }     from '@/services/ingrediente_service'


const props = defineProps<{ show: boolean }>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add-to-cart', item: object): void
}>()


const productosStore    = useStoreProductos()
const ingredientesStore = useStoreIngredientes()
const tamanosStore      = useStoreTamanos()        


interface ExtraMitad {
  ingrediente_id: number
  nombre:         string
  precio_extra:   number
  cantidad:       number
}

interface MitadState {
  producto_id: number | null
  extras:      ExtraMitad[]
}


const selectedTamanoId  = ref<number | null>(null)
const cantidad          = ref(1)
const errorMsg          = ref('')
const mitad1            = ref<MitadState>({ producto_id: null, extras: [] })
const mitad2            = ref<MitadState>({ producto_id: null, extras: [] })
const showExtrasModal   = ref(false)
const mitadActivaExtras = ref<1 | 2>(1)

const pizzas = computed(() =>
  productosStore.pizzas.filter(p => p.activo)
)

const preciosPorProducto = ref<Record<number, number>>({})

const getPrecioMitad = (productoId: number): number => {
  return preciosPorProducto.value[productoId] ?? 0
}

const getPrecioExtra = (ingredienteId: number): number => {
  if (!selectedTamanoId.value) {
    return ingredientesStore.ingredientes.find(i => i.id === ingredienteId)?.precio_extra ?? 0
  }
  const config = ingredientesStore.ingredientes_tamanos.find(
    it => it.ingrediente_id === ingredienteId && it.tamano_id === selectedTamanoId.value
  )
  if (config) return config.precio_extra
  return ingredientesStore.ingredientes.find(i => i.id === ingredienteId)?.precio_extra ?? 0
}

const mitadActiva = computed(() =>
  mitadActivaExtras.value === 1 ? mitad1.value : mitad2.value
)

const estaSeleccionado = (ingId: number): boolean =>
  mitadActiva.value.extras.some(e => e.ingrediente_id === ingId)

const precioBase = computed(() => {
  if (!selectedTamanoId.value || !mitad1.value.producto_id || !mitad2.value.producto_id)
    return 0
  const p1 = getPrecioMitad(mitad1.value.producto_id)
  const p2 = getPrecioMitad(mitad2.value.producto_id)
  return Math.max(p1, p2)
})

const extrasTotal = computed(() => {
  const sumar = (extras: ExtraMitad[]) =>
    extras.reduce((s, e) => s + e.precio_extra * e.cantidad, 0)
  return sumar(mitad1.value.extras) + sumar(mitad2.value.extras)
})

const totalModal = computed(() =>
  (precioBase.value + extrasTotal.value) * cantidad.value
)

const puedeAgregar = computed(() =>
  !!selectedTamanoId.value &&
  !!mitad1.value.producto_id &&
  !!mitad2.value.producto_id
)


watch(() => props.show, async (abierto) => {
  if (!abierto) return
  resetear()

  
  await Promise.all([
    tamanosStore.fetchTamanos(),
    ingredientesStore.fetchIngredientes(),
    ingredientesStore.fetchIngredientesTamanos(),
    productosStore.fetchProductos(),
  ])

  
  if (tamanosStore.tamanos.length > 0) {
    selectedTamanoId.value = tamanosStore.tamanos[0].id
  }
})


watch(selectedTamanoId, async (nuevoTamanoId) => {
  if (!nuevoTamanoId) return
  
  mitad1.value.extras = []
  mitad2.value.extras = []
  
  if (mitad1.value.producto_id) await cargarPrecio(mitad1.value.producto_id)
  if (mitad2.value.producto_id) await cargarPrecio(mitad2.value.producto_id)
})


const resetear = () => {
  selectedTamanoId.value    = null
  cantidad.value            = 1
  errorMsg.value            = ''
  mitad1.value              = { producto_id: null, extras: [] }
  mitad2.value              = { producto_id: null, extras: [] }
  showExtrasModal.value     = false
  preciosPorProducto.value  = {}
}

const seleccionarTamano = (id: number) => {
  selectedTamanoId.value = id
}



const cargarPrecio = async (productoId: number) => {
  if (!selectedTamanoId.value) return
  await productosStore.fetchTamanosProducto(productoId)
  const pt = productosStore.tamanos_producto.find(
    t => t.tamano_id === selectedTamanoId.value
  )
  preciosPorProducto.value = {
    ...preciosPorProducto.value,
    [productoId]: pt?.precio ?? 0
  }
}

const onChangeMitad = async (mitad: 1 | 2) => {
  const productoId = mitad === 1 ? mitad1.value.producto_id : mitad2.value.producto_id
  if (mitad === 1) mitad1.value.extras = []
  else             mitad2.value.extras = []

  if (productoId && selectedTamanoId.value) {
    await cargarPrecio(productoId)
  }
}

const abrirExtras = (mitad: 1 | 2) => {
  mitadActivaExtras.value = mitad
  showExtrasModal.value   = true
}

const toggleExtra = (ing: Ingrediente) => {
  const lista = mitadActiva.value.extras
  const idx   = lista.findIndex(e => e.ingrediente_id === ing.id)
  if (idx !== -1) {
    lista.splice(idx, 1)
  } else {
    lista.push({
      ingrediente_id: ing.id,
      nombre:         ing.nombre,
      precio_extra:   getPrecioExtra(ing.id),
      cantidad:       1,
    })
  }
}

const quitarExtra = (mitad: 1 | 2, ingId: number) => {
  const lista = mitad === 1 ? mitad1.value.extras : mitad2.value.extras
  const idx   = lista.findIndex(e => e.ingrediente_id === ingId)
  if (idx !== -1) lista.splice(idx, 1)
}


const agregarAlCarrito = () => {
  errorMsg.value = ''

  if (!selectedTamanoId.value) {
    errorMsg.value = 'Selecciona un tamaño'; return
  }
  if (!mitad1.value.producto_id || !mitad2.value.producto_id) {
    errorMsg.value = 'Selecciona ambas mitades'; return
  }

  const tamano         = tamanosStore.tamanos.find(t => t.id === selectedTamanoId.value)
  const pizza1         = productosStore.productos.find(p => p.id === mitad1.value.producto_id)
  const pizza2         = productosStore.productos.find(p => p.id === mitad2.value.producto_id)
  const precioUnitario = precioBase.value + extrasTotal.value

  emit('add-to-cart', {
    type:            'mitad',
    tamano_id:       selectedTamanoId.value,
    tamano_nombre:   tamano?.nombre ?? '',
    precio_unitario: precioUnitario,
    cantidad:        cantidad.value,
    subtotal:        precioUnitario * cantidad.value,
    nombre:          `${pizza1?.nombre ?? '?'} / ${pizza2?.nombre ?? '?'}`,
    mitades: [
      {
        mitad:       1,
        producto_id: mitad1.value.producto_id,
        extras:      mitad1.value.extras.map(e => ({
          ingrediente_id: e.ingrediente_id,
          cantidad:       e.cantidad,
        }))
      },
      {
        mitad:       2,
        producto_id: mitad2.value.producto_id,
        extras:      mitad2.value.extras.map(e => ({
          ingrediente_id: e.ingrediente_id,
          cantidad:       e.cantidad,
        }))
      }
    ]
  })

  emit('close')
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
  background: #fff; padding: 30px; border-radius: 20px;
  max-width: 700px; width: 90%; max-height: 85vh; overflow-y: auto;
  border-top: 8px solid #ff0000; border-bottom: 8px solid #ff0000;
}

.modal-content h3 {
  color: #000; font-size: 24px; margin-bottom: 20px;
  padding-bottom: 10px; border-bottom: 3px solid #ff0000;
  display: flex; align-items: center; gap: 10px;
}

.modal-content h3 i { color: #ff0000; }

.section        { margin-bottom: 25px; }
.section-title  { color: #000; font-weight: 700; margin-bottom: 10px; }

.size-options   { display: flex; gap: 10px; flex-wrap: wrap; }

.size-option {
  background: #f5f5f5; border: 2px solid #e0e0e0;
  border-radius: 10px; padding: 10px 20px;
  cursor: pointer; transition: all 0.3s; font-weight: 700; color: #000;
}

.size-option.selected {
  border-color: #ff0000; background: #ff0000; color: #fff;
}

.mitades-grid {
  display: grid; grid-template-columns: 1fr auto 1fr;
  gap: 15px; align-items: start; margin-bottom: 25px;
}

.mitad-divider {
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 800; color: #ff0000; padding-top: 40px;
}

.mitad-panel {
  background: #f5f5f5; border: 2px solid #e0e0e0;
  border-radius: 15px; padding: 15px; transition: all 0.3s;
}

.mitad-panel.completa { border-color: #ff0000; }

.mitad-header {
  color: #000; font-weight: 800; font-size: 16px;
  margin-bottom: 12px; text-align: center;
}

.pizza-select {
  width: 100%; padding: 10px; border: 2px solid #e0e0e0;
  border-radius: 8px; font-size: 14px; font-weight: 600;
  margin-bottom: 10px; cursor: pointer; color: #000;
}

.pizza-select:focus { outline: none; border-color: #ff0000; }

.mitad-precio {
  text-align: center; color: #ff0000;
  font-weight: 800; font-size: 18px; margin-bottom: 10px;
}

.extras-section { margin-top: 10px; }

.show-extras-btn {
  width: 100%; background: #000; color: #fff;
  border: none; padding: 8px; border-radius: 8px;
  font-weight: 700; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  gap: 5px; transition: all 0.3s;
}

.show-extras-btn:hover { background: #ff0000; }

.extras-badge {
  background: #ff0000; color: #fff; border-radius: 50%;
  width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center; font-size: 12px;
}

.extras-resumen { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }

.extra-tag {
  background: #ff0000; color: #fff;
  padding: 3px 8px; border-radius: 12px;
  font-size: 12px; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
}

.extra-tag button {
  background: none; border: none; color: #fff; cursor: pointer; font-size: 11px; padding: 0;
}

.quantity-selector {
  display: flex; align-items: center; justify-content: center;
  gap: 15px; margin-bottom: 20px;
  background: #f5f5f5; padding: 15px; border-radius: 10px;
}

.quantity-btn {
  background: #000; color: #fff; border: none;
  width: 40px; height: 40px; border-radius: 50%;
  font-size: 20px; font-weight: 700; cursor: pointer; transition: all 0.3s;
}

.quantity-btn:hover { background: #ff0000; }

.quantity-display {
  font-size: 24px; font-weight: 700; color: #000; min-width: 50px; text-align: center;
}

.modal-total {
  background: #000; color: #fff; padding: 15px;
  border-radius: 10px; text-align: right;
  margin-bottom: 15px; font-size: 20px; font-weight: 700;
}

.modal-total span { color: #ff0000; font-size: 24px; margin-left: 10px; }

.error-msg {
  background: #fff0f0; border: 1px solid #ff0000;
  color: #cc0000; padding: 10px 15px; border-radius: 8px;
  margin-bottom: 15px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}

.modal-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.modal-btn {
  padding: 15px; border: none; border-radius: 50px;
  font-weight: 700; cursor: pointer; transition: all 0.3s; text-transform: uppercase;
}

.modal-btn.primary   { background: #ff0000; color: #fff; }
.modal-btn.secondary { background: #000; color: #fff; }

.modal-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255,0,0,0.3);
}

.modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.extras-modal {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.8);
  display: flex; justify-content: center; align-items: center; z-index: 1100;
}

.extras-modal-content {
  background: #fff; border-radius: 20px; width: 90%; max-width: 400px;
  border-top: 5px solid #ff0000; border-bottom: 5px solid #ff0000; overflow: hidden;
}

.extras-modal-header {
  background: #000; color: #fff; padding: 15px 20px;
  display: flex; justify-content: space-between; align-items: center;
}

.extras-modal-header h4 { margin: 0; color: #ff0000; }

.close-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
.close-btn:hover { color: #ff0000; }

.extras-list { padding: 20px; max-height: 300px; overflow-y: auto; }

.extra-select-item {
  display: flex; align-items: center; gap: 15px;
  padding: 12px; border-bottom: 1px solid #eee;
}

.extra-select-item:last-child { border-bottom: none; }

.extra-select-item input[type="checkbox"] {
  width: 20px; height: 20px; cursor: pointer; accent-color: #ff0000;
}

.extra-select-details { flex: 1; display: flex; justify-content: space-between; align-items: center; }
.extra-select-name    { color: #000; font-weight: 600; }
.extra-select-price   { color: #ff0000; font-weight: 700; }

.extras-modal-footer { padding: 15px; background: #f5f5f5; text-align: center; }

::-webkit-scrollbar       { width: 8px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #cc0000; }

@media (max-width: 600px) {
  .mitades-grid { grid-template-columns: 1fr; }
  .mitad-divider { padding-top: 0; }
}
</style>