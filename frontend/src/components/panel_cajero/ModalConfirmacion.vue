<template>
  <div v-if="show" class="modal" @click.self="$emit('cerrar')">
    <div class="modal-content">
      <div class="success-icon">
        <i class="fas fa-check-circle"></i>
      </div>

      <h3>¡VENTA COMPLETADA!</h3>
      <p class="mensaje">{{ mensaje }}</p>

      <div v-if="factura" class="factura-info">
        <h4>DETALLE DE FACTURA</h4>

        <div class="factura-row">
          <span>N° Factura</span>
          <strong>{{ factura.numero_factura }}</strong>
        </div>
        <div class="factura-row">
          <span>Cliente</span>
          <strong>{{ factura.cliente?.nombre ?? clienteNombre }}</strong>
        </div>
        <div class="factura-row">
          <span>Subtotal</span>
          <strong>Bs {{ Number(factura.subtotal).toFixed(2) }}</strong>
        </div>
        <div v-if="Number(factura.descuento) > 0" class="factura-row descuento">
          <span>Descuento ({{ descuentoPct }}%)</span>
          <strong>− Bs {{ Number(factura.descuento).toFixed(2) }}</strong>
        </div>
        <div v-if="Number(factura.descuento) > 0" class="factura-row">
          <span>Base gravable</span>
          <strong>Bs {{ (Number(factura.subtotal) - Number(factura.descuento)).toFixed(2) }}</strong>
        </div>
        <div class="factura-row">
          <span>IVA (16%)</span>
          <strong>Bs {{ Number(factura.impuesto).toFixed(2) }}</strong>
        </div>
        <div class="factura-row total-final">
          <span>TOTAL</span>
          <strong>Bs {{ totalFactura.toFixed(2) }}</strong>
        </div>
        <div class="factura-row">
          <span>Método</span>
          <strong>{{ metodo === 'efectivo' ? 'Efectivo' : 'QR' }}</strong>
        </div>
        <div v-if="metodo === 'efectivo'" class="factura-row">
          <span>Cambio entregado</span>
          <strong>Bs {{ cambio.toFixed(2) }}</strong>
        </div>
        <div class="factura-row">
          <span>Fecha</span>
          <strong>{{ fechaFormateada }}</strong>
        </div>
      </div>

      <div class="action-buttons">
        <button
          class="modal-btn primary"
          :disabled="imprimiendo || !pedidoId"
          @click="$emit('imprimir')"
        >
          <i class="fas" :class="imprimiendo ? 'fa-spinner fa-spin' : 'fa-print'"></i>
          {{ imprimiendo ? 'GENERANDO...' : 'IMPRIMIR TICKET' }}
        </button>
        <button class="modal-btn secondary" @click="$emit('cerrar')">
          <i class="fas fa-times"></i> CERRAR
        </button>
      </div>

      <div v-if="errorTicket" class="modal-error">
        <i class="fas fa-exclamation-triangle"></i> {{ errorTicket }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Factura } from '@/services/service_factura'

const props = defineProps<{
  show:         boolean
  factura:      Factura | null
  mensaje:      string
  metodo:       'efectivo' | 'QR'
  cambio:       number
  clienteNombre: string
  descuentoPct: number
  pedidoId:     number | null
  imprimiendo:  boolean
  errorTicket:  string | null
}>()

defineEmits<{
  (e: 'cerrar'):   void
  (e: 'imprimir'): void
}>()

const totalFactura = computed(() => {
  if (!props.factura) return 0
  const f = props.factura as any
  if (f.total != null) return Number(f.total)
  return Number(f.subtotal ?? 0) + Number(f.impuesto ?? 0) - Number(f.descuento ?? 0)
})

const fechaFormateada = computed(() => {
  if (!props.factura) return ''
  const f = props.factura as any
  const raw = f.fecha ?? f.created_at
  return raw ? new Date(raw).toLocaleString('es-BO') : ''
})
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
  max-width: 560px; width: 90%; max-height: 85vh; overflow-y: auto;
  border-top: 8px solid #ff0000; border-bottom: 8px solid #ff0000;
  text-align: center;
  animation: slideIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideIn {
  from { transform: translateY(-30px) scale(0.95); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}

.success-icon { margin-bottom: 15px; }
.success-icon i { font-size: 64px; color: #28a745; }

.modal-content h3 {
  color: #000; font-size: 26px; font-weight: 800;
  margin-bottom: 10px; text-transform: uppercase;
}

.mensaje { color: #555; font-size: 15px; margin-bottom: 20px; }

.factura-info {
  background: #f8f9fa; padding: 20px; border-radius: 12px;
  margin-bottom: 20px; text-align: left; border-left: 5px solid #ff0000;
}

.factura-info h4 {
  color: #ff0000; font-size: 14px; font-weight: 700;
  letter-spacing: 1px; margin-bottom: 14px;
  text-transform: uppercase; text-align: center;
}

.factura-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; border-bottom: 1px solid #eeeeee;
  font-size: 14px; color: #444;
}
.factura-row:last-child { border-bottom: none; }
.factura-row strong { color: #000; font-weight: 700; }

.factura-row.descuento strong { color: #cc0000; }

.factura-row.total-final {
  font-size: 17px; font-weight: 700; color: #000;
  border-top: 2px solid #ff0000; margin-top: 6px; padding-top: 10px;
}
.factura-row.total-final strong { color: #ff0000; font-size: 20px; }

.action-buttons {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px; margin-top: 20px;
}

.modal-btn {
  padding: 14px; border: none; border-radius: 50px;
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
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }
</style>