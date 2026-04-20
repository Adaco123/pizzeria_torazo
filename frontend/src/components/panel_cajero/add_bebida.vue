<template>
  <div v-if="show" class="modal" @click.self="closeModal">
    <div class="modal-content">
      <h3>Añadir stock · <span class="product-name">{{ bebida?.nombre }}</span></h3>

      
      <div class="stock-info">
        <div class="stock-title">Stock disponible</div>
        <div
          class="stock-value"
          :class="{
            'stock-bajo':    stockActual !== null && stockActual <= 5 && stockActual > 0,
            'stock-agotado': stockActual === 0,
          }"
        >
          <i
            class="fas"
            :class="{
              'fa-check-circle':        stockActual === null || stockActual > 5,
              'fa-exclamation-triangle': stockActual !== null && stockActual <= 5 && stockActual > 0,
              'fa-times-circle':         stockActual === 0,
            }"
          ></i>
          {{ stockActual === null ? 'Sin registro' : stockActual + ' unidades' }}
        </div>
      </div>

      
      <div v-if="stockActual !== null && stockActual > 0 && stockActual <= 5" class="stock-alert warning">
        <i class="fas fa-exclamation-circle"></i>
        ¡Stock bajo! Solo quedan {{ stockActual }} unidades
      </div>
      <div v-if="stockActual === 0" class="stock-alert danger">
        <i class="fas fa-times-circle"></i>
        Producto agotado — puedes añadir stock nuevo
      </div>

      
      <div class="quantity-section">
        <div class="section-subtitle">Cantidad a añadir</div>
        <div class="quantity-selector">
          <button class="quantity-btn" @click="changeQuantity(-1)" :disabled="quantity <= 1">−</button>
          <span class="quantity-display">{{ quantity }}</span>
          <button class="quantity-btn" @click="changeQuantity(1)">+</button>
        </div>
        <div class="quick-quantity">
          <button
            v-for="num in [1, 2, 3, 5, 10, 24]"
            :key="num"
            class="quick-btn"
            :class="{ active: quantity === num }"
            @click="setQuantity(num)"
          >{{ num }}</button>
        </div>
      </div>

      
      <div class="modal-total">
        Total a añadir:
        <span>{{ quantity }} {{ quantity === 1 ? 'unidad' : 'unidades' }}</span>
      </div>

      
      <div v-if="movStore.error" class="form-error">
        <i class="fas fa-exclamation-circle"></i> {{ movStore.error }}
      </div>

      
      <div class="modal-buttons">
        <button
          class="modal-btn primary"
          @click="addStock"
          :disabled="quantity === 0 || movStore.loading"
        >
          <i class="fas" :class="movStore.loading ? 'fa-spinner fa-spin' : 'fa-plus-circle'"></i>
          {{ movStore.loading ? 'GUARDANDO...' : 'AÑADIR STOCK' }}
        </button>
        <button class="modal-btn secondary" @click="closeModal" :disabled="movStore.loading">
          CANCELAR
        </button>
      </div>

      
      <div class="history-section">
        <div class="section-subtitle">
          <i class="fas fa-history"></i> Últimos movimientos
        </div>

        
        <div v-if="movStore.loading && movStore.movimientos.length === 0" class="history-loading">
          <i class="fas fa-spinner fa-spin"></i> Cargando historial...
        </div>

        
        <div v-else-if="movStore.movimientos.length === 0" class="history-empty">
          <i class="fas fa-inbox"></i> Sin movimientos registrados
        </div>

        
        <div v-else class="history-list">
          <div
            v-for="mov in movStore.movimientos"
            :key="mov.id"
            class="history-item"
          >
            
            <div class="history-meta">
              <span class="history-user">
                <i class="fas fa-user-circle"></i>
                {{ mov.usuario_nombre ?? 'Desconocido' }}
              </span>
              <span class="history-date">{{ formatDate(mov.fecha) }}</span>
              <span v-if="mov.turno_id" class="history-turno">
                Turno #{{ mov.turno_id }}
              </span>
            </div>

            
            <div class="history-right">
              <span class="history-quantity">+{{ mov.cantidad }}</span>
              <span class="history-stock-range">
                {{ mov.stock_anterior }} → {{ mov.stock_nuevo }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMovimientosStockStore } from '@/stores/movimientos/movimiento_store'


interface Bebida {
  producto_id: number
  nombre:      string
  stock:       number | null
  agotado:     boolean
}


const props = defineProps<{
  show:   boolean
  bebida: Bebida | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'stock-updated', nuevoStock: number): void
}>()


const movStore = useMovimientosStockStore()


const quantity    = ref(1)
const stockLocal  = ref<number | null>(null)  


const stockActual = computed<number | null>(() => {
  
  if (stockLocal.value !== null) return stockLocal.value
  if (props.bebida?.stock === undefined) return null
  return props.bebida?.stock ?? null
})


watch(() => props.show, async (val) => {
  if (val && props.bebida) {
    quantity.value   = 1
    stockLocal.value = null
    movStore.limpiarMovimientos()
    await movStore.fetchMovimientosPorProducto(props.bebida.producto_id, 10)
  }
})


function changeQuantity(delta: number) {
  const next = quantity.value + delta
  if (next >= 1) quantity.value = next
}

function setQuantity(num: number) {
  if (num >= 1) quantity.value = num
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

function closeModal() {
  movStore.limpiarMovimientos()
  emit('close')
}


async function addStock() {
  if (!props.bebida || quantity.value === 0) return

  const mov = await movStore.agregarStock({
    producto_id: props.bebida.producto_id,
    cantidad:    quantity.value,
  })

  if (mov) {
    
    stockLocal.value = mov.stock_nuevo ?? null
    emit('stock-updated', mov.stock_nuevo ?? 0)
    quantity.value = 1
    
    await movStore.fetchMovimientosPorProducto(props.bebida.producto_id, 10)
  }
}
</script>

<style scoped>
.modal {
  display: flex;
  position: fixed;
  inset: 0;
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
  max-width: 500px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  border-top: 8px solid #ff0000;
  border-bottom: 8px solid #ff0000;
  box-shadow: 0 25px 60px rgba(255, 0, 0, 0.2);
  font-family: 'Montserrat', sans-serif;
}

.modal-content h3 {
  color: #000;
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 3px solid #ff0000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.product-name {
  color: #ff0000;
  text-transform: none;
  font-weight: 700;
}


.stock-info {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 14px;
  text-align: center;
}

.stock-title {
  color: #555;
  font-weight: 700;
  margin-bottom: 10px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.stock-value {
  font-size: 32px;
  font-weight: 800;
  color: #28a745;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.stock-value i          { font-size: 28px; }
.stock-value.stock-bajo    { color: #ffc107; }
.stock-value.stock-agotado { color: #dc3545; }


.stock-alert {
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 13px;
}

.stock-alert.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
.stock-alert.danger  { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
.stock-alert i { font-size: 18px; }


.quantity-section { margin-bottom: 20px; }

.section-subtitle {
  color: #000;
  font-weight: 700;
  margin-bottom: 12px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.section-subtitle i { color: #ff0000; }

.quantity-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #f5f5f5;
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.quantity-btn {
  background: #000;
  color: #fff;
  border: none;
  width: 40px; height: 40px;
  border-radius: 50%;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  line-height: 1;
  display: flex; align-items: center; justify-content: center;
}
.quantity-btn:hover:not(:disabled) { background: #ff0000; }
.quantity-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.quantity-display {
  font-size: 28px;
  font-weight: 800;
  color: #000;
  min-width: 50px;
  text-align: center;
}

.quick-quantity {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.quick-btn {
  background: #f5f5f5;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 4px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: #000;
  font-family: 'Montserrat', sans-serif;
}
.quick-btn:hover,
.quick-btn.active {
  background: #ff0000;
  border-color: #ff0000;
  color: #fff;
}


.modal-total {
  background: #000;
  color: #fff;
  padding: 14px 18px;
  border-radius: 10px;
  text-align: right;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 700;
}
.modal-total span {
  color: #ff0000;
  font-size: 22px;
  margin-left: 10px;
}


.form-error {
  background: #fff0f0;
  border: 1px solid #ffcdcd;
  color: #cc0000;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}


.modal-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 24px;
}

.modal-btn {
  padding: 14px;
  border: none;
  border-radius: 50px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s;
  text-transform: uppercase;
  font-family: 'Montserrat', sans-serif;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.modal-btn.primary   { background: #ff0000; color: #fff; box-shadow: 0 4px 12px rgba(255,0,0,0.3); }
.modal-btn.primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255,0,0,0.4); }
.modal-btn.secondary { background: #000; color: #fff; }
.modal-btn.secondary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
.modal-btn:disabled  { opacity: 0.5; cursor: not-allowed; transform: none; }


.history-section {
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.history-loading,
.history-empty {
  text-align: center;
  color: #aaa;
  font-size: 13px;
  padding: 18px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  transition: border-color 0.2s;
}

.history-item:hover { border-color: #ffcdcd; }

.history-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.history-user {
  font-size: 13px;
  font-weight: 700;
  color: #000;
  display: flex;
  align-items: center;
  gap: 5px;
}

.history-user i { color: #ff0000; font-size: 12px; }

.history-date {
  font-size: 11px;
  color: #888;
}

.history-turno {
  font-size: 10px;
  color: #bbb;
  font-weight: 600;
}

.history-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.history-quantity {
  font-size: 18px;
  font-weight: 800;
  color: #28a745;
}

.history-stock-range {
  font-size: 11px;
  color: #999;
  font-weight: 600;
}


::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }


@media (max-width: 480px) {
  .quick-quantity            { grid-template-columns: repeat(3, 1fr); }
  .stock-value               { font-size: 24px; }
  .modal-buttons             { grid-template-columns: 1fr; }
}
</style>