<template>
  <div v-if="show" class="modal" @click.self="emit('close')">
    <div class="modal-content">

      
      <div class="modal-header">
        <h3><i class="fas fa-receipt"></i> RESUMEN DEL TURNO</h3>
        <div class="header-btns">
          <button class="btn-imprimir" @click="imprimir">
            <i class="fas fa-print"></i> IMPRIMIR
          </button>
          <button class="btn-cerrar" @click="emit('close')">✕</button>
        </div>
      </div>

      
      <div v-if="loading" class="loading">
        <i class="fas fa-spinner fa-spin"></i> Cargando resumen...
      </div>

      
      <div v-else-if="error" class="error-msg">
        <i class="fas fa-exclamation-triangle"></i> {{ error }}
      </div>

      
      <div v-else-if="resumen" id="resumen-imprimible">

        
        <div class="r-header">
          <div class="r-empresa">PIZZERIA EL TORAZO</div>
          <div class="r-titulo">CIERRE DE TURNO #{{ resumen.turno_id }}</div>
          <div class="r-line">
            <span><b>Cajero:</b> {{ resumen.usuario }}</span>
          </div>
          <div class="r-line">
            <span><b>Apertura:</b> {{ formatFecha(resumen.apertura) }}</span>
          </div>
          <div class="r-line">
            <span><b>Cierre:</b> {{ resumen.cierre ? formatFecha(resumen.cierre) : 'En curso' }}</span>
          </div>
        </div>

        <div class="r-sep"></div>

        
        <div class="r-seccion">
          <div class="r-titulo-sec">RESUMEN FINANCIERO</div>
          <div class="r-fila">
            <span>Monto inicial</span>
            <span>Bs {{ resumen.monto_inicio.toFixed(2) }}</span>
          </div>
          <div class="r-fila">
            <span>Pedidos atendidos</span>
            <span>{{ resumen.total_pedidos }}</span>
          </div>
          <div class="r-fila">
            <span>Facturas emitidas</span>
            <span>{{ resumen.total_facturas }}</span>
          </div>
          <div class="r-fila">
            <span>Subtotal</span>
            <span>Bs {{ resumen.total_subtotal.toFixed(2) }}</span>
          </div>
          <div class="r-fila">
            <span>IVA (16%)</span>
            <span>Bs {{ resumen.total_impuesto.toFixed(2) }}</span>
          </div>
          <div class="r-fila r-fila--total">
            <span>TOTAL VENDIDO</span>
            <span>Bs {{ resumen.total_vendido.toFixed(2) }}</span>
          </div>
          <template v-if="resumen.monto_cierre !== null">
            <div class="r-fila">
              <span>Monto cierre declarado</span>
              <span>Bs {{ resumen.monto_cierre.toFixed(2) }}</span>
            </div>
            <div class="r-fila" :class="diferencia >= 0 ? 'r-fila--pos' : 'r-fila--neg'">
              <span>Diferencia de caja</span>
              <span>Bs {{ diferencia.toFixed(2) }}</span>
            </div>
          </template>
        </div>

        <div class="r-sep"></div>

        
        <div class="r-seccion" v-if="resumen.pizzas.length">
          <div class="r-titulo-sec">PIZZAS VENDIDAS</div>
          <table class="r-tabla">
            <thead>
              <tr><th>Pizza</th><th>Tamaño</th><th class="c">Cant</th><th class="r">Bs</th></tr>
            </thead>
            <tbody>
              <template v-for="prod in resumen.pizzas" :key="prod.producto_id">
                <tr v-for="(data, tamano) in prod.tamanos" :key="tamano">
                  <td>{{ prod.nombre }}</td>
                  <td>{{ tamano }}</td>
                  <td class="c">{{ data.cantidad }}</td>
                  <td class="r">{{ data.subtotal.toFixed(2) }}</td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr class="r-pie">
                <td colspan="2"><b>Total</b></td>
                <td class="c"><b>{{ totalCantidad(resumen.pizzas) }}</b></td>
                <td class="r"><b>{{ totalSubtotal(resumen.pizzas).toFixed(2) }}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="r-sep" v-if="resumen.pizzas.length"></div>

        
        <div class="r-seccion" v-if="resumen.bebidas.length">
          <div class="r-titulo-sec">BEBIDAS VENDIDAS</div>
          <table class="r-tabla">
            <thead>
              <tr><th>Bebida</th><th>Tamaño</th><th class="c">Cant</th><th class="r">Bs</th></tr>
            </thead>
            <tbody>
              <template v-for="prod in resumen.bebidas" :key="prod.producto_id">
                <tr v-for="(data, tamano) in prod.tamanos" :key="tamano">
                  <td>{{ prod.nombre }}</td>
                  <td>{{ tamano }}</td>
                  <td class="c">{{ data.cantidad }}</td>
                  <td class="r">{{ data.subtotal.toFixed(2) }}</td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr class="r-pie">
                <td colspan="2"><b>Total</b></td>
                <td class="c"><b>{{ totalCantidad(resumen.bebidas) }}</b></td>
                <td class="r"><b>{{ totalSubtotal(resumen.bebidas).toFixed(2) }}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="r-sep" v-if="resumen.bebidas.length"></div>

        
        <div class="r-seccion" v-if="resumen.combos?.length">
          <div class="r-titulo-sec">COMBOS VENDIDOS</div>
          <table class="r-tabla">
            <thead>
              <tr><th>Combo</th><th class="c">Cant</th><th class="r">Bs</th></tr>
            </thead>
            <tbody>
              <tr v-for="combo in resumen.combos" :key="combo.combo_id">
                <td>{{ combo.nombre }}</td>
                <td class="c">{{ combo.cantidad }}</td>
                <td class="r">{{ combo.subtotal.toFixed(2) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="r-pie">
                <td><b>Total</b></td>
                <td class="c"><b>{{ resumen.combos.reduce((s,c) => s + c.cantidad, 0) }}</b></td>
                <td class="r"><b>{{ resumen.combos.reduce((s,c) => s + c.subtotal, 0).toFixed(2) }}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="r-sep" v-if="resumen.combos?.length"></div>

        
        <div class="r-seccion" v-if="resumen.otros.length">
          <div class="r-titulo-sec">OTROS PRODUCTOS</div>
          <table class="r-tabla">
            <thead>
              <tr><th>Producto</th><th>Tamaño</th><th class="c">Cant</th><th class="r">Bs</th></tr>
            </thead>
            <tbody>
              <template v-for="prod in resumen.otros" :key="prod.producto_id">
                <tr v-for="(data, tamano) in prod.tamanos" :key="tamano">
                  <td>{{ prod.nombre }}</td>
                  <td>{{ tamano }}</td>
                  <td class="c">{{ data.cantidad }}</td>
                  <td class="r">{{ data.subtotal.toFixed(2) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="r-sep" v-if="resumen.otros.length"></div>

        
        <div class="r-seccion" v-if="resumen.inventario_bebidas.length">
          <div class="r-titulo-sec">INVENTARIO BEBIDAS</div>
          <table class="r-tabla">
            <thead>
              <tr><th>Bebida</th><th class="c">Vendidas</th><th class="c">Stock</th></tr>
            </thead>
            <tbody>
              <tr
                v-for="beb in resumen.inventario_bebidas"
                :key="beb.producto_id"
                :class="{ 'tr-bajo': beb.stock_actual <= 5 && beb.stock_actual > 0, 'tr-agotado': beb.stock_actual === 0 }"
              >
                <td>{{ beb.nombre }}</td>
                <td class="c">{{ beb.vendidas }}</td>
                <td class="c">
                  {{ beb.stock_actual }}
                  <span v-if="beb.stock_actual === 0"     class="badge badge-rojo">AGT</span>
                  <span v-else-if="beb.stock_actual <= 5" class="badge badge-naranja">BAJO</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="r-sep" v-if="resumen.inventario_bebidas.length"></div>

        
        <div class="r-seccion" v-if="resumen.movimientos_stock?.length">
          <div class="r-titulo-sec">REPOSICIONES DE STOCK</div>
          <table class="r-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cajero</th>
                <th class="c">+Cant</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mov in resumen.movimientos_stock" :key="mov.id">
                <td>{{ mov.producto_nombre }}</td>
                <td>{{ mov.usuario_nombre }}</td>
                <td class="c mov-qty">+{{ mov.cantidad }}</td>
                <td>{{ formatHora(mov.fecha) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="mov-nota">
            Stock final bebidas actualizado en inventario
          </div>
        </div>

        <div class="r-sep" v-if="resumen.movimientos_stock?.length"></div>

        
        <div class="r-seccion" v-if="resumen.top_extras?.length">
          <div class="r-titulo-sec">EXTRAS MÁS PEDIDOS</div>
          <table class="r-tabla">
            <thead>
              <tr><th>Ingrediente</th><th class="c">Cant</th><th class="r">Bs</th></tr>
            </thead>
            <tbody>
              <tr v-for="ex in resumen.top_extras.slice(0, 5)" :key="ex.ingrediente_id">
                <td>{{ ex.nombre }}</td>
                <td class="c">{{ ex.cantidad }}</td>
                <td class="r">{{ ex.ingreso.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        
        <div class="r-sep"></div>
        <div class="r-footer">
          Generado el {{ fechaActual }}<br>
          *** Gracias ***
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStoreTurnos }    from '@/stores/turnos/store_turno'
import type { ResumenTurno } from '@/services/service_turno'
import { getResumenTurnoPdf } from '@/services/service_turno';

const props = defineProps<{
  show:    boolean
  turnoId: number | null
}>()

const emit = defineEmits<{ (e: 'close'): void }>()


const turnosStore = useStoreTurnos()


const resumen = ref<ResumenTurno | null>(null)
const loading = ref(false)
const error   = ref<string | null>(null)


watch(() => props.show, async (abierto) => {
  if (!abierto || !props.turnoId) return
  loading.value = true
  error.value   = null
  resumen.value = null
  const data = await turnosStore.fetchResumenTurno(props.turnoId)
  if (data) resumen.value = data
  else      error.value   = turnosStore.error ?? 'Error al cargar resumen'
  loading.value = false
})


const diferencia = computed(() => {
  if (!resumen.value || resumen.value.monto_cierre === null) return 0
  return resumen.value.monto_cierre - resumen.value.monto_inicio - resumen.value.total_vendido
})

const fechaActual = computed(() => new Date().toLocaleString('es-BO'))


const formatFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

const totalCantidad = (productos: ResumenTurno['pizzas']) =>
  productos.reduce((s, p) =>
    s + Object.values(p.tamanos).reduce((ss, t) => ss + t.cantidad, 0), 0)

const totalSubtotal = (productos: ResumenTurno['pizzas']) =>
  productos.reduce((s, p) =>
    s + Object.values(p.tamanos).reduce((ss, t) => ss + t.subtotal, 0), 0)


const imprimir = () => {
  if (!props.turnoId) return
  getResumenTurnoPdf(props.turnoId)
}
</script>

<style scoped>
.modal {
  display: flex;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #ffffff;
  border-radius: 16px;
  width: 95%;
  max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
  border-top: 6px solid #c0392b;
  border-bottom: 6px solid #c0392b;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  font-family: 'Courier New', monospace;
}


.modal-header {
  background: #1e1e1e;
  color: #fff;
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: 10px 10px 0 0;
}

.modal-header h3 {
  font-size: 17px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: 'Montserrat', sans-serif;
}

.modal-header h3 i { color: #e74c3c; }

.header-btns { display: flex; gap: 10px; align-items: center; }

.btn-imprimir {
  background: #c0392b;
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 20px;
  font-weight: 700;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Montserrat', sans-serif;
  transition: background 0.2s, transform 0.2s;
}
.btn-imprimir:hover { background: #a93226; transform: translateY(-1px); }

.btn-cerrar {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: color 0.2s;
}
.btn-cerrar:hover { color: #e74c3c; }


.loading, .error-msg {
  padding: 40px;
  text-align: center;
  font-size: 16px;
  color: #444;
  font-family: 'Montserrat', sans-serif;
}
.error-msg { color: #c0392b; }


#resumen-imprimible {
  padding: 24px 28px;
  max-width: 420px;
  margin: 0 auto;
}


.r-empresa {
  font-size: 18px;
  font-weight: 900;
  text-align: center;
  margin-bottom: 2px;
  letter-spacing: 1px;
}
.r-header{
  color: black;
}
.r-titulo {
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8px;
  color: #000000;
}

.r-line {
  font-size: 12px;
  margin-bottom: 2px;
}


.r-sep {
  border-top: 1px dashed #aaa;
  margin: 10px 0;
}


.r-seccion { margin-bottom: 8px;color:black }

.r-titulo-sec {
  font-weight: 900;
  font-size: 12px;
  text-align: center;
  color: black;
  text-decoration: underline;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}


.r-fila {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 3px;
}

.r-fila--total {
  font-weight: 900;
  font-size: 14px;
  border-top: 1px solid #000;
  border-bottom: 1px solid #000;
  padding: 4px 0;
  margin: 5px 0;
}

.r-fila--pos { color: #000000; font-weight: 700; }
.r-fila--neg { color: #000000; font-weight: 700; }


table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  margin-bottom: 4px;
}

th {
  font-weight: 700;
  border-bottom: 1px solid #000;
  padding: 3px 4px;
  text-align: left;
  font-size: 11px;
}

td { padding: 3px 4px; border-bottom: 1px solid #eee; }
.c { text-align: center; }
.r { text-align: right; }

.r-pie td {
  border-top: 1px dashed #000;
  border-bottom: none;
  padding-top: 4px;
}


.badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
  font-weight: 700;
}

.mov-qty  { font-weight: 700; color: #155724; }
.mov-nota {
  font-size: 10px;
  text-align: center;
  color: #888;
  margin-top: 4px;
  font-style: italic;
}


.r-footer {
  text-align: center;
  font-size: 11px;
  color: #555;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #aaa;
  line-height: 1.6;
}


::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #c0392b; border-radius: 4px; }
</style>