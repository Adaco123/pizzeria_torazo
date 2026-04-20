<template>
  <div class="cart-section">
    <div class="cart-header">
      <h3><i class="fas fa-shopping-cart"></i> CARRITO</h3>
      <button
        class="clear-cart"
        @click="$emit('limpiar')"
        :disabled="cart.length === 0"
      >
        <i class="fas fa-trash"></i> LIMPIAR
      </button>
    </div>

    <ClienteSelector v-model:clienteSeleccionado="clienteLocal" />

    <div class="cart-items">
      <template v-if="cart.length === 0">
        <div class="cart-empty">
          <i class="fas fa-shopping-basket"></i>
          <p>Carrito vacío</p>
        </div>
      </template>
      <template v-else>
        <div
          v-for="(item, index) in cart"
          :key="item.carrito_item_id"
          class="cart-item"
          :class="{ 'cart-item-combo': item.type === 'combo' }"
        >

          <template v-if="item.type === 'combo'">
            <div class="cart-item-header">
              <span class="cart-item-name">
                <i class="fas fa-box-open" style="color:#e67e00;margin-right:4px;"></i>
                {{ item.nombre }} x{{ item.cantidad }}
              </span>
              <span class="cart-item-price combo-item-price">Bs {{ item.subtotal.toFixed(2) }}</span>
            </div>
            <div class="cart-item-size">Combo — Bs {{ item.precio_unitario.toFixed(2) }} c/u</div>
            <div v-if="item.combo_items?.length" class="cart-item-extras">
              <span v-for="ci in item.combo_items" :key="ci.producto_id" style="display:inline-block;margin-right:6px;">
                {{ ci.cantidad }}× {{ ci.nombre }}
              </span>
            </div>
          </template>

          <template v-else-if="item.type === 'mitad'">
            <div class="cart-item-header">
              <span class="cart-item-name">🍕 {{ item.nombre }} x{{ item.cantidad }}</span>
              <span class="cart-item-price">Bs {{ item.subtotal.toFixed(2) }}</span>
            </div>
            <div class="cart-item-size">
              Tamaño: {{ item.tamano_nombre }} — Mitad/Mitad (Bs {{ item.precio_unitario.toFixed(2) }} c/u)
            </div>
            <div v-if="item.mitades" class="cart-item-extras">
              <div v-for="m in item.mitades" :key="m.mitad">
                <strong>Mitad {{ m.mitad }}:</strong> {{ pizzaNombre(m.producto_id) }}
                <span v-if="m.extras.length"> + {{ m.extras.length }} extra(s)</span>
              </div>
            </div>
            <div v-if="item.instrucciones" class="cart-item-special">"{{ item.instrucciones }}"</div>
          </template>

          <template v-else-if="item.type === 'pizza'">
            <div class="cart-item-header">
              <span class="cart-item-name">{{ item.nombre }} x{{ item.cantidad }}</span>
              <span class="cart-item-price">Bs {{ item.subtotal.toFixed(2) }}</span>
            </div>
            <div class="cart-item-size">
              Tamaño: {{ item.tamano_nombre }} (Bs {{ item.precio_unitario.toFixed(2) }} c/u)
            </div>
            <div v-if="item.extras.length" class="cart-item-extras">
              <strong>Extras:</strong>
              {{ item.extras.map(e => `${e.nombre} (+Bs ${e.precio_extra.toFixed(2)})`).join(', ') }}
            </div>
            <div v-if="item.instrucciones" class="cart-item-special">"{{ item.instrucciones }}"</div>
          </template>

          <template v-else>
            <div class="cart-item-header">
              <span class="cart-item-name">{{ item.nombre }} x{{ item.cantidad }}</span>
              <span class="cart-item-price">Bs {{ item.subtotal.toFixed(2) }}</span>
            </div>
          </template>

          <div class="cart-item-footer">
            <div class="cart-item-qty">
              <button class="qty-btn" @click="$emit('update-cantidad', index, -1, item)">-</button>
              <span>{{ item.cantidad }}</span>
              <button class="qty-btn" @click="$emit('update-cantidad', index, +1, item)">+</button>
            </div>
            <button class="remove-btn" @click="$emit('remove-item', index)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Totales -->
    <div class="cart-total">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>Bs {{ subtotal.toFixed(2) }}</span>
      </div>

      <div class="total-row descuento-row">
        <span class="descuento-label">
          Descuento
          <input
            type="number"
            v-model.number="descuentoLocal"
            min="0" max="100" step="1"
            class="descuento-input"
            :disabled="cart.length === 0"
            placeholder="0"
          />
          <span class="descuento-symbol">%</span>
        </span>
        <span class="descuento-monto">− Bs {{ descuentoMonto.toFixed(2) }}</span>
      </div>

      <div v-if="descuentoLocal > 0" class="total-row base-gravable-row">
        <span>Base gravable:</span>
        <span>Bs {{ subtotalConDesc.toFixed(2) }}</span>
      </div>

      <div class="total-row">
        <span>IVA (16%):</span>
        <span>Bs {{ iva.toFixed(2) }}</span>
      </div>
      <div class="grand-total">
        <span>TOTAL:</span>
        <span>Bs {{ totalConIva.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Botones de pago -->
    <div class="payment-buttons">
      <button
        class="payment-btn cash"
        @click="$emit('pagar', 'efectivo')"
        :disabled="!clienteLocal || cart.length === 0 || cargando"
      >
        <i class="fas fa-money-bill-wave"></i>
        {{ cargando ? 'PROCESANDO...' : 'EFECTIVO' }}
      </button>
      <button
        class="payment-btn qr"
        @click="$emit('pagar', 'qr')"
        :disabled="!clienteLocal || cart.length === 0 || cargando"
      >
        <i class="fas fa-qrcode"></i>
        {{ cargando ? 'PROCESANDO...' : 'QR' }}
      </button>
    </div>

    <div v-if="errorVenta" class="cart-error">
      <i class="fas fa-exclamation-triangle"></i> {{ errorVenta }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ClienteSelector from '@/components/panel_cajero/ClienteSelector.vue'

interface ExtraItem {
  ingrediente_id: number
  nombre:         string
  precio_extra:   number
  cantidad:       number
  tamano_id:      number | null
}

interface MitadCarrito {
  mitad:       1 | 2
  producto_id: number
  extras:      { ingrediente_id: number; cantidad: number }[]
}

interface ComboItemCarrito {
  producto_id: number
  nombre:      string
  cantidad:    number
}

interface CartItem {
  carrito_item_id:  string
  type:             'pizza' | 'bebida' | 'otro' | 'mitad' | 'combo'
  producto_id:      number
  combo_id?:        number
  combo_items?:     ComboItemCarrito[]
  nombre:           string
  tamano_id:        number | null
  tamano_nombre:    string | null
  precio_unitario:  number
  cantidad:         number
  subtotal:         number
  extras:           ExtraItem[]
  instrucciones:    string
  mitades?:         MitadCarrito[]
}

const props = defineProps<{
  cart:                  CartItem[]
  productos:             { id: number; nombre: string }[]
  clienteSeleccionado:   any
  descuentoPct:          number
  cargando:              boolean
  errorVenta:            string | null
}>()

const emit = defineEmits<{
  (e: 'pagar',           metodo: 'efectivo' | 'qr'): void  // ← 'tarjeta' → 'qr'
  (e: 'limpiar'):                                    void
  (e: 'update-cantidad', index: number, delta: number, item: CartItem): void
  (e: 'remove-item',     index: number): void
  (e: 'update:clienteSeleccionado', val: any):    void
  (e: 'update:descuentoPct',        val: number): void
}>()

const clienteLocal = computed({
  get: () => props.clienteSeleccionado,
  set: (v) => emit('update:clienteSeleccionado', v),
})

const descuentoLocal = computed({
  get: () => props.descuentoPct,
  set: (v) => emit('update:descuentoPct', v),
})

const subtotal        = computed(() => props.cart.reduce((s, i) => s + i.subtotal, 0))
const descuentoMonto  = computed(() => subtotal.value * (descuentoLocal.value / 100))
const subtotalConDesc = computed(() => subtotal.value - descuentoMonto.value)
const iva             = computed(() => subtotalConDesc.value * 0.16)
const totalConIva     = computed(() => subtotalConDesc.value + iva.value)

const pizzaNombre = (productoId: number): string =>
  props.productos.find(p => p.id === productoId)?.nombre ?? `Pizza #${productoId}`
</script>

<style scoped>
.cart-section {
  background: #ffffff; border-radius: 15px;
  padding: 20px; border: 1px solid #e0e0e0;
  display: flex; flex-direction: column; height: fit-content;
}

.cart-header {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 20px;
  padding-bottom: 10px; border-bottom: 3px solid #ff0000;
}
.cart-header h3 {
  color: #000000; font-size: 20px; font-weight: 700;
  display: flex; align-items: center; gap: 10px;
}
.cart-header h3 i { color: #ff0000; }

.clear-cart {
  background: none; border: none;
  color: #ff0000; cursor: pointer; font-size: 16px; font-weight: 600;
}
.clear-cart:disabled { opacity: 0.5; cursor: not-allowed; }

.cart-items { max-height: 400px; overflow-y: auto; margin-bottom: 20px; }

.cart-empty {
  text-align: center; color: #999; padding: 20px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.cart-empty i { font-size: 40px; }

.cart-item {
  background: #f5f5f5; border-radius: 10px;
  padding: 15px; margin-bottom: 10px; border-left: 5px solid #ff0000;
}
.cart-item-combo      { border-left-color: #e08000; }
.cart-item-combo .cart-item-price { color: #e08000; }

.cart-item-header  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.cart-item-name    { font-weight: 700; color: #000000; }
.cart-item-price   { color: #ff0000; font-weight: 800; }
.cart-item-size    { font-size: 12px; color: #666; margin-bottom: 5px; }
.cart-item-extras  { font-size: 12px; color: #666; margin-bottom: 5px; }
.cart-item-special {
  font-size: 12px; color: #000; font-style: italic;
  background: #fff3cd; padding: 5px 8px; border-radius: 5px;
  margin-bottom: 8px; border-left: 3px solid #ffc107;
}

.cart-item-footer { display: flex; justify-content: space-between; align-items: center; }
.cart-item-qty    { display: flex; align-items: center; gap: 10px; }

.qty-btn {
  background: #000; color: #fff; border: none;
  width: 30px; height: 30px; border-radius: 50%;
  cursor: pointer; font-weight: 700;
}
.qty-btn:hover { background: #ff0000; }

.remove-btn {
  background: #ff0000; color: #fff; border: none;
  width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
}

.cart-total {
  background: #000; color: #fff;
  padding: 20px; border-radius: 10px; margin-top: 20px;
}

.total-row {
  display: flex; justify-content: space-between;
  margin-bottom: 10px; font-size: 16px;
}

.descuento-row {
  background: rgba(255,0,0,0.12);
  border-radius: 8px; padding: 8px 6px; margin-bottom: 10px;
}
.descuento-label { display: flex; align-items: center; gap: 8px; font-size: 16px; }
.descuento-input {
  width: 56px; background: #222; border: 1px solid #ff0000;
  color: #ffffff; border-radius: 6px; padding: 3px 6px;
  font-size: 14px; text-align: center; outline: none;
}
.descuento-input:focus { border-color: #ff4444; box-shadow: 0 0 0 2px rgba(255,0,0,0.25); }
.descuento-input:disabled { opacity: 0.4; cursor: not-allowed; }
.descuento-symbol { color: #ff0000; font-weight: 700; font-size: 16px; }
.descuento-monto  { color: #ff4444; font-weight: 700; }

.base-gravable-row {
  font-size: 14px; color: #aaa;
  border-top: 1px solid #333; padding-top: 8px; margin-top: 4px;
}

.grand-total {
  font-size: 24px; font-weight: 800; color: #ff0000;
  border-top: 2px solid #ff0000; padding-top: 10px; margin-top: 10px;
  display: flex; justify-content: space-between;
}

.payment-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }

.payment-btn {
  padding: 12px; border: none; border-radius: 50px;
  font-weight: 700; cursor: pointer; transition: all 0.3s;
  text-transform: uppercase; font-size: 14px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.payment-btn.cash { background: #000; color: #fff; border: 2px solid #000; }
.payment-btn.qr   { background: #ff0000; color: #fff; border: 2px solid #ff0000; } /* ← antes .card */
.payment-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255,0,0,0.3); }
.payment-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cart-error {
  margin-top: 10px; padding: 10px 15px;
  background: #fff0f0; border: 1px solid #ff0000;
  border-radius: 8px; color: #cc0000;
  font-size: 13px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}

::-webkit-scrollbar       { width: 8px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #cc0000; }
</style>