<template>
  <div class="ventas-tab">

    <div v-if="cargando" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Cargando ventas...</p>
    </div>

    <div v-else-if="errorMsg" class="error-state">
      <i class="fas fa-exclamation-circle"></i>
      <p>{{ errorMsg }}</p>
      <button class="btn-reintentar" @click="cargarDatos">
        <i class="fas fa-redo"></i> REINTENTAR
      </button>
    </div>

    <template v-else>

      
      <div class="tab-header">
        <h3><i class="fas fa-chart-bar"></i> REPORTE DE VENTAS</h3>
        <div class="header-controls">
          <div class="seg-control">
            <button
              v-for="v in vistas" :key="v.id"
              :class="['seg-btn', { active: vistaActiva === v.id }]"
              @click="setVista(v.id)"
            >{{ v.label }}</button>
          </div>
          <div class="date-range">
            <input type="date" v-model="fechaInicio" @change="cargarDatos" />
            <span class="date-sep">—</span>
            <input type="date" v-model="fechaFin" @change="cargarDatos" />
          </div>
          <button class="export-btn" @click="exportarCSV">
            <i class="fas fa-download"></i> EXPORTAR
          </button>
        </div>
      </div>

      <div v-if="!resumenes.length" class="empty-state">
        <i class="fas fa-chart-bar"></i>
        <p>No hay turnos en el período seleccionado</p>
      </div>

      <template v-else>

        
        <div class="kpi-grid">
          <div class="kpi-card" v-for="kpi in kpis" :key="kpi.label">
            <div class="kpi-icon"><i :class="['fas', kpi.icon]"></i></div>
            <div class="kpi-body">
              <div class="kpi-label">{{ kpi.label }}</div>
              <div class="kpi-value">{{ kpi.value }}</div>
              <div class="kpi-trend" :class="kpi.trend >= 0 ? 'up' : 'dn'">
                <i :class="['fas', kpi.trend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down']"></i>
                {{ Math.abs(kpi.trend) }}% vs anterior
              </div>
            </div>
          </div>
        </div>

        
        <div class="chart-card wide">
          <div class="chart-card-header">
            <span class="chart-title">
              <i class="fas fa-chart-line"></i> VENTAS (Bs.) Y PEDIDOS
            </span>
            <div class="legend">
              <span class="leg"><span class="leg-sq" style="background:#ff0000;"></span>Ventas</span>
              <span class="leg"><span class="leg-ln" style="background:#ffffff;"></span>Pedidos</span>
            </div>
          </div>
          <div class="chart-wrap">
            <div style="position:relative;width:100%;height:260px;">
              <canvas ref="c1"></canvas>
            </div>
          </div>
        </div>

        
        <div class="charts-row">

          <div class="chart-card">
            <div class="chart-card-header">
              <span class="chart-title"><i class="fas fa-star"></i> EXTRAS MÁS VENDIDOS</span>
            </div>
            <div class="chart-wrap">
              <div v-if="!topExtras.length" class="empty-mini">
                <i class="fas fa-box-open"></i>
                <span>Sin extras en el período</span>
              </div>
              <div v-else style="position:relative;width:100%;height:200px;">
                <canvas ref="c2"></canvas>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-card-header">
              <span class="chart-title"><i class="fas fa-clock"></i> PEDIDOS POR HORA</span>
              <span class="hora-pico" v-if="horaPico">
                Pico: {{ horaPico }}hs
              </span>
            </div>
            <div class="chart-wrap">
              <div v-if="!ventasHora.length" class="empty-mini">
                <i class="fas fa-clock"></i>
                <span>Sin datos de hora</span>
              </div>
              <div v-else style="position:relative;width:100%;height:200px;">
                <canvas ref="c3"></canvas>
              </div>
            </div>
          </div>

        </div>

        
        <div class="chart-card wide">
          <div class="chart-card-header">
            <span class="chart-title"><i class="fas fa-trophy"></i> TOP PRODUCTOS POR INGRESOS</span>
          </div>
          <div class="chart-wrap">
            <div :style="{ position:'relative', width:'100%', height: topProductosHeight }">
              <canvas ref="c5"></canvas>
            </div>
          </div>
        </div>

        
        <div class="table-card">
          <div class="chart-card-header">
            <span class="chart-title"><i class="fas fa-clock"></i> TURNOS DEL PERÍODO</span>
            <span style="font-size:12px;color:#555;">
              {{ resumenes.length }} turno{{ resumenes.length !== 1 ? 's' : '' }}
            </span>
          </div>
          <div class="table-scroll">
            <table class="ventas-table">
              <thead>
                <tr>
                  <th>Turno</th><th>Cajero</th><th>Apertura</th><th>Cierre</th>
                  <th>Pedidos</th><th>Total vendido</th><th>Estado</th><th>Reporte</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in turnosTabla" :key="t.id">
                  <td class="mono">#{{ t.id }}</td>
                  <td>{{ t.cajero }}</td>
                  <td class="mono">{{ t.apertura }}</td>
                  <td class="mono">{{ t.cierre }}</td>
                  <td class="center">{{ t.pedidos }}</td>
                  <td class="bold red">Bs. {{ t.total.toFixed(2) }}</td>
                  <td>
                    <span class="badge" :class="t.abierto ? 'badge-open' : 'badge-closed'">
                      {{ t.abierto ? 'En curso' : 'Cerrado' }}
                    </span>
                  </td>
                  <td>
                    <button
                      v-if="!t.abierto"
                      class="btn-pdf"
                      @click="abrirResumenPDF(t.id)"
                    >
                      <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <span v-else class="sin-reporte">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </template>
  </div>

  
  <ResumenTurnoPDF
    :show="showResumenModal"
    :turno-id="turnoIdParaResumen"
    @close="showResumenModal = false; turnoIdParaResumen = null"
  />

</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useStoreTurnos } from '@/stores/turnos/store_turno'
import { getResumenTurno, type ResumenTurno } from '@/services/service_turno'
import ResumenTurnoPDF from '@/components/panel_cajero/ResumenTurnoPDF.vue'

Chart.register(...registerables)


const turnosStore = useStoreTurnos()


const cargando  = ref(false)
const errorMsg  = ref<string | null>(null)
const resumenes = ref<ResumenTurno[]>([])


const today   = new Date().toISOString().split('T')[0]
const hace7   = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
const fechaInicio = ref(hace7)
const fechaFin    = ref(today)


const vistaActiva = ref<'turno' | 'dia' | 'semana'>('turno')
const vistas = [
  { id: 'turno',  label: 'Por turno' },
  { id: 'dia',    label: 'Por día'   },
  { id: 'semana', label: 'Semanal'   },
] as const


async function cargarDatos() {
  cargando.value  = true
  errorMsg.value  = null
  resumenes.value = []
  try {
    await turnosStore.fetchTurnos(true)

    const inicio = new Date(fechaInicio.value)
    const fin    = new Date(fechaFin.value)
    fin.setHours(23, 59, 59)

    const filtrados = turnosStore.turnos.filter(t => {
      const ap = new Date(t.apertura)
      return ap >= inicio && ap <= fin
    })

    
    const resultados = await Promise.all(
      filtrados.map(t => getResumenTurno(t.id).then(r => r.data.data))
    )
    resumenes.value = resultados.filter((r): r is ResumenTurno => r !== null)
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Error al cargar ventas'
  } finally {
    cargando.value = false
    await nextTick()
    await nextTick()
    buildCharts()
  }
}


function sumarBs(arr: ResumenTurno['pizzas']): number {
  return arr.reduce(
    (s, p) => s + Object.values(p.tamanos).reduce((t, v) => t + v.subtotal, 0), 0
  )
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}


interface Punto { label: string; vendido: number; pedidos: number }

const puntos = computed<Punto[]>(() => {
  if (vistaActiva.value === 'turno') {
    return resumenes.value.map(r => ({
      label:   `T${r.turno_id}`,
      vendido: r.total_vendido,
      pedidos: r.total_pedidos,
    }))
  }
  if (vistaActiva.value === 'dia') {
    const map: Record<string, Punto> = {}
    resumenes.value.forEach(r => {
      const dia = r.apertura.slice(0, 10)
      const lbl = new Date(dia).toLocaleDateString('es-BO', { day:'2-digit', month:'short' })
      if (!map[dia]) map[dia] = { label: lbl, vendido: 0, pedidos: 0 }
      map[dia].vendido += r.total_vendido
      map[dia].pedidos += r.total_pedidos
    })
    return Object.values(map)
  }
  return [resumenes.value.reduce<Punto>(
    (a, r) => ({ label:'Semana', vendido: a.vendido + r.total_vendido, pedidos: a.pedidos + r.total_pedidos }),
    { label:'', vendido:0, pedidos:0 }
  )]
})


const kpis = computed(() => {
  const total   = puntos.value.reduce((s, p) => s + p.vendido, 0)
  const pedidos = puntos.value.reduce((s, p) => s + p.pedidos, 0)
  const pts     = puntos.value
  const tend    = pts.length >= 2
    ? +((pts.at(-1)!.vendido - pts.at(-2)!.vendido) / (pts.at(-2)!.vendido || 1) * 100).toFixed(1)
    : 0
  return [
    { label:'Total vendido', value:`Bs. ${total.toFixed(2)}`, icon:'fa-chart-line',    trend: tend },
    { label:'Pedidos',       value:`${pedidos}`,               icon:'fa-shopping-cart', trend: 0   },
    { label:'Turnos',        value:`${resumenes.value.length}`,icon:'fa-clock',         trend: 0   },
  ]
})


interface ExtraIngrediente { ingrediente_id: number; nombre: string; cantidad: number; ingreso: number }

const topExtras = computed(() => {
  const map: Record<string, { nombre: string; cantidad: number; bs: number }> = {}
  resumenes.value.forEach(r => {
    const extras: ExtraIngrediente[] = (r as any).top_extras ?? []
    extras.forEach(e => {
      if (!map[e.nombre]) map[e.nombre] = { nombre: e.nombre, cantidad: 0, bs: 0 }
      map[e.nombre].cantidad += e.cantidad
      map[e.nombre].bs       += e.ingreso
    })
  })
  return Object.values(map).sort((a, b) => b.bs - a.bs).slice(0, 6)
})


interface VentaHora { hora: number; pedidos: number; subtotal: number }

const ventasHora = computed<VentaHora[]>(() => {
  const map: Record<number, VentaHora> = {}
  resumenes.value.forEach(r => {
    const porHora: VentaHora[] = (r as any).ventas_por_hora ?? []
    porHora.forEach(vh => {
      if (!map[vh.hora]) map[vh.hora] = { hora: vh.hora, pedidos: 0, subtotal: 0 }
      map[vh.hora].pedidos  += vh.pedidos
      map[vh.hora].subtotal += vh.subtotal
    })
  })
  return Object.values(map).sort((a, b) => a.hora - b.hora)
})

const horaPico = computed(() => {
  if (!ventasHora.value.length) return null
  const max = ventasHora.value.reduce((m, v) => v.pedidos > m.pedidos ? v : m)
  return String(max.hora).padStart(2, '0')
})


const topProductos = computed(() => {
  const map: Record<string, { nombre: string; bs: number }> = {}
  resumenes.value.forEach(r => {
    ;[...r.pizzas, ...r.bebidas, ...r.otros].forEach(p => {
      const bs = sumarBs([p])
      if (!map[p.nombre]) map[p.nombre] = { nombre: p.nombre, bs: 0 }
      map[p.nombre].bs += bs
    })
  })
  return Object.values(map).sort((a, b) => b.bs - a.bs).slice(0, 8)
})

const topProductosHeight = computed(() =>
  `${(topProductos.value.length || 1) * 44 + 60}px`
)


const turnosTabla = computed(() =>
  resumenes.value.map(r => ({
    id:       r.turno_id,
    cajero:   r.usuario,
    apertura: fmtDT(r.apertura),
    cierre:   r.cierre ? fmtDT(r.cierre) : '—',
    pedidos:  r.total_pedidos,
    total:    r.total_vendido,
    abierto:  r.cierre === null,
  }))
)


const showResumenModal   = ref(false)
const turnoIdParaResumen = ref<number | null>(null)

function abrirResumenPDF(turnoId: number) {
  turnoIdParaResumen.value = turnoId
  showResumenModal.value   = true
}


const c1 = ref<HTMLCanvasElement | null>(null)
const c2 = ref<HTMLCanvasElement | null>(null)
const c3 = ref<HTMLCanvasElement | null>(null)
const c5 = ref<HTMLCanvasElement | null>(null)
let buildTimer: ReturnType<typeof setTimeout> | null = null

function destroyCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return
  Chart.getChart(canvas)?.destroy()
}

function destroyCharts() {
  ;[c1, c2, c3, c5].forEach(c => destroyCanvas(c.value))
}

function buildCharts() {
  if (buildTimer) { clearTimeout(buildTimer); buildTimer = null }
  destroyCharts()
  if (!puntos.value.length) return

  const canvasActivos = [c1.value, c5.value]
  if (topExtras.value.length)  canvasActivos.push(c2.value)
  if (ventasHora.value.length) canvasActivos.push(c3.value)

  const listos = canvasActivos.every(c => c && c.offsetWidth > 0)
  if (!listos) { buildTimer = setTimeout(buildCharts, 150); return }

  const gridC = 'rgba(255,255,255,0.08)'
  const tickC = 'rgba(255,255,255,0.55)'
  const baseX = { ticks:{ color:tickC, font:{size:11}, maxRotation:30, autoSkip:false }, grid:{ display:false } }
  const baseY = { ticks:{ color:tickC, font:{size:11} }, grid:{ color:gridC } }

  const labels = puntos.value.map(p => p.label)
  const ventas = puntos.value.map(p => +p.vendido.toFixed(2))
  const peds   = puntos.value.map(p => p.pedidos)

  
  new Chart(c1.value!, {
    data: {
      labels,
      datasets: [
        { type:'bar',  label:'Ventas',  data:ventas, backgroundColor:'#ff0000', borderRadius:4, yAxisID:'y'  },
        { type:'line', label:'Pedidos', data:peds,   borderColor:'#ffffff', backgroundColor:'rgba(255,255,255,0.08)',
          tension:0.4, pointRadius:4, pointBackgroundColor:'#ffffff', fill:true, yAxisID:'y2' }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:  baseX,
        y:  { ...baseY, position:'left',  ticks:{ ...baseY.ticks, callback:(v:any)=>'Bs.'+v } },
        y2: { ...baseY, position:'right', grid:{ display:false }, ticks:{ color:tickC, font:{size:11} } }
      }
    } as any
  })

  
  if (c2.value && topExtras.value.length) {
    new Chart(c2.value, {
      type:'bar',
      data:{
        labels: topExtras.value.map(e => e.nombre),
        datasets:[{
          data: topExtras.value.map(e => +e.bs.toFixed(2)),
          backgroundColor: topExtras.value.map((_, i) =>
            i === 0 ? '#ff0000' : i === 1 ? '#cc0000' : i === 2 ? '#990000' : '#555555'
          ),
          borderRadius:4, borderSkipped:false
        }]
      },
      options:{
        indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{ label:(ctx:any)=>`Bs. ${ctx.raw} · ${topExtras.value[ctx.dataIndex]?.cantidad} veces pedido` } }
        },
        scales:{
          x:{ ...baseY, ticks:{ ...baseY.ticks, callback:(v:any)=>'Bs.'+v } },
          y:{ ticks:{ color:tickC, font:{size:11} }, grid:{ display:false } }
        }
      } as any
    })
  }

  
  if (c3.value && ventasHora.value.length) {
    const horaLabels = ventasHora.value.map(v => `${String(v.hora).padStart(2,'0')}:00`)
    const horaPeds   = ventasHora.value.map(v => v.pedidos)
    const horaMax    = Math.max(...horaPeds)

    new Chart(c3.value, {
      type:'line',
      data:{
        labels: horaLabels,
        datasets:[{
          data: horaPeds,
          borderColor:'#ff0000',
          backgroundColor:'rgba(255,0,0,0.15)',
          tension:0.4,
          pointBackgroundColor: horaPeds.map(v => v === horaMax ? '#ffffff' : '#ff0000'),
          pointRadius:          horaPeds.map(v => v === horaMax ? 7 : 3),
          fill:true
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{ label:(ctx:any)=>`${ctx.raw} pedidos` } }
        },
        scales:{
          x:{ ticks:{ color:tickC, font:{size:10}, maxRotation:45, autoSkip:true }, grid:{ display:false } },
          y:{ ...baseY, ticks:{ ...baseY.ticks, stepSize:1 } }
        }
      } as any
    })
  }

  
  if (c5.value && topProductos.value.length) {
    new Chart(c5.value, {
      type:'bar',
      data:{
        labels: topProductos.value.map(p => p.nombre),
        datasets:[{
          data: topProductos.value.map(p => +p.bs.toFixed(2)),
          backgroundColor:'#ff0000', borderRadius:4, borderSkipped:false
        }]
      },
      options:{
        indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{ label:(ctx:any)=>`Bs. ${ctx.raw}` } }
        },
        scales:{
          x:{ ...baseY, ticks:{ ...baseY.ticks, callback:(v:any)=>'Bs.'+v } },
          y:{ ticks:{ color:tickC, font:{size:12} }, grid:{ display:false } }
        }
      } as any
    })
  }
}


function setVista(v: 'turno' | 'dia' | 'semana') {
  vistaActiva.value = v
  nextTick(buildCharts)
}

watch(puntos, async () => { await nextTick(); await nextTick(); buildCharts() })

function exportarCSV() {
  const rows = [
    ['Turno','Cajero','Apertura','Cierre','Pedidos','Total vendido'],
    ...resumenes.value.map(r => [
      r.turno_id, r.usuario, r.apertura, r.cierre ?? '—',
      r.total_pedidos, r.total_vendido.toFixed(2)
    ])
  ]
  const link = document.createElement('a')
  link.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'))
  link.download = `ventas_${fechaInicio.value}_${fechaFin.value}.csv`
  link.click()
}

onMounted(cargarDatos)
onUnmounted(() => { if (buildTimer) clearTimeout(buildTimer); destroyCharts() })
</script>

<style scoped>
.ventas-tab { display: flex; flex-direction: column; gap: 20px; }

.loading-state, .error-state, .empty-state {
  display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:12px; padding:60px 20px; color:#666; text-align:center;
}
.loading-state i, .error-state i, .empty-state i { font-size:36px; color:#ff0000; }
.error-state { color:#dc3545; }

.btn-reintentar {
  padding:8px 18px; background:#ff0000; color:#fff; border:none;
  border-radius:50px; font-size:12px; font-weight:700; cursor:pointer;
  display:flex; align-items:center; gap:6px; font-family:'Montserrat',sans-serif;
}

.tab-header {
  display:flex; justify-content:space-between; align-items:center;
  padding-bottom:15px; border-bottom:3px solid #ff0000; flex-wrap:wrap; gap:12px;
}
.tab-header h3 { color:#000; font-size:20px; font-weight:700; text-transform:uppercase; display:flex; align-items:center; gap:10px; }
.tab-header h3 i { color:#ff0000; }
.header-controls { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }

.seg-control { display:flex; border:2px solid #000; border-radius:50px; overflow:hidden; }
.seg-btn {
  padding:7px 16px; font-size:12px; font-weight:700; text-transform:uppercase;
  letter-spacing:0.5px; border:none; background:transparent; color:#555;
  cursor:pointer; font-family:'Montserrat',sans-serif; transition:all 0.2s;
}
.seg-btn.active { background:#ff0000; color:#fff; }

.date-range { display:flex; align-items:center; gap:8px; }
.date-range input {
  padding:7px 12px; border:2px solid #e0e0e0; border-radius:8px;
  font-size:13px; font-family:'Montserrat',sans-serif; transition:border-color 0.2s;
}
.date-range input:focus { border-color:#ff0000; outline:none; }
.date-sep { color:#999; font-weight:700; }

.export-btn {
  padding:7px 16px; background:#000; color:#fff; border:2px solid #000;
  border-radius:50px; font-size:12px; font-weight:700; text-transform:uppercase;
  letter-spacing:0.5px; cursor:pointer; display:flex; align-items:center; gap:6px;
  font-family:'Montserrat',sans-serif; transition:all 0.2s;
}
.export-btn:hover { background:#ff0000; border-color:#ff0000; }

.kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
.kpi-card {
  background:#000; border-radius:14px; padding:18px 20px;
  display:flex; align-items:center; gap:16px; border:1px solid #222;
  transition:transform 0.2s, box-shadow 0.2s;
}
.kpi-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(255,0,0,0.25); }
.kpi-icon { width:52px; height:52px; background:#ff0000; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.kpi-icon i { font-size:22px; color:#fff; }
.kpi-label { font-size:12px; color:#999; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.5px; }
.kpi-value { font-size:20px; font-weight:800; color:#fff; }
.kpi-trend { font-size:11px; font-weight:600; margin-top:3px; display:flex; align-items:center; gap:4px; }
.kpi-trend.up { color:#28a745; }
.kpi-trend.dn { color:#dc3545; }

.chart-card { background:#000; border-radius:16px; border:1px solid #222; overflow:hidden; }
.chart-card.wide { width:100%; }
.chart-card-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid #222; }
.chart-title { font-size:13px; font-weight:700; color:#ccc; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:8px; }
.chart-title i { color:#ff0000; }
.chart-wrap { padding:14px 16px; }

.hora-pico {
  font-size:12px; font-weight:700; color:#ff0000;
  background:rgba(255,0,0,0.1); border:1px solid rgba(255,0,0,0.3);
  padding:3px 10px; border-radius:50px;
}

.legend { display:flex; gap:14px; }
.leg { display:flex; align-items:center; gap:5px; font-size:12px; color:#888; }
.leg-sq { width:10px; height:10px; border-radius:2px; }
.leg-ln { width:16px; height:2px; border-radius:1px; }

.charts-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

.empty-mini {
  display:flex; align-items:center; gap:8px;
  color:#555; font-size:13px; padding:60px 0; justify-content:center;
}
.empty-mini i { color:#ff0000; font-size:20px; }

.table-card { background:#000; border-radius:16px; border:1px solid #222; overflow:hidden; }
.table-scroll { overflow-x:auto; }
.ventas-table { width:100%; border-collapse:collapse; font-size:13px; }
.ventas-table th { background:#111; color:#888; padding:12px 16px; text-align:left; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
.ventas-table td { padding:12px 16px; border-bottom:1px solid #111; color:#ccc; }
.ventas-table tbody tr:hover { background:#0d0d0d; }
.ventas-table tbody tr:last-child td { border-bottom:none; }

.mono   { font-family:'Courier New',monospace; font-size:12px; }
.bold   { font-weight:700; }
.red    { color:#ff0000 !important; }
.center { text-align:center; }

.btn-pdf {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: transparent;
  border: 1px solid #ff0000;
  border-radius: 20px;
  color: #ff0000;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Montserrat', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-pdf:hover:not(:disabled) { background: #ff0000; color: #fff; }
.btn-pdf:disabled { opacity: 0.5; cursor: not-allowed; }

.sin-reporte { color: #444; font-size: 13px; }

.badge { display:inline-block; padding:4px 10px; border-radius:50px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.3px; }
.badge-open   { background:rgba(40,167,69,0.15); color:#28a745; border:1px solid #28a745; }
.badge-closed { background:rgba(255,255,255,0.05); color:#666; border:1px solid #333; }

@media (max-width:1100px) { .kpi-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:768px) {
  .kpi-grid { grid-template-columns:1fr; }
  .charts-row { grid-template-columns:1fr; }
  .header-controls { flex-direction:column; align-items:flex-start; }
}
</style>