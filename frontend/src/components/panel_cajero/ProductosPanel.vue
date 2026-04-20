<template>
  <div class="products-section">
    <div class="section-title">
      <span><i class="fas fa-pizza-slice"></i> PRODUCTOS</span>
      <span class="product-count">{{ productosFiltrados.length }} items</span>
    </div>

    <div class="category-row">
      <div class="category-tabs">
        <button
          v-for="cat in CATEGORIAS"
          :key="cat.id"
          class="category-tab"
          :class="{ active: filtroActivo === cat.id }"
          @click="filtroActivo = cat.id"
        >
          {{ cat.nombre }}
        </button>
      </div>
      <button
        class="mitad-mitad-tab"
        @click="$emit('open-mitad')"
        :disabled="!turnoActivo"
      >
        <i class="fas fa-pizza-slice"></i> MITAD / MITAD
      </button>
    </div>

    
    <div class="products-grid" v-if="filtroActivo !== ID_CAT_COMBOS">
      <div
        v-for="producto in productosFiltrados"
        :key="producto.id"
        class="product-card"
        @click="$emit('add-producto', producto)"
      >
        <i :class="['fas', getIconProducto(producto), 'product-icon']"></i>
        <div class="product-name">{{ producto.nombre }}</div>
        <div class="product-price">
          <template v-if="producto.categoria_id === ID_CAT_PIZZAS">
            Bs {{ producto.precio_base }}
          </template>
          <template v-else-if="producto.categoria_id === ID_CAT_BEBIDAS">
            <div class="bebida-info">
              <span>Bs {{ producto.precio_base }}</span>
              <span class="stock-badge" :class="getStockClass(producto.id)">
                <i class="fas" :class="getStockIcon(producto.id)"></i>
                {{ getStockTexto(producto.id) }}
              </span>
            </div>
            <button
              class="inventory-btn"
              @click.stop="$emit('open-stock', producto)"
              title="Gestionar inventario"
            >
              <i class="fas fa-boxes"></i>
            </button>
          </template>
          <template v-else>
            Bs {{ producto.precio_base }}
          </template>
        </div>
      </div>
    </div>

    
    <div class="products-grid" v-else>
      <div
        v-for="combo in combosActivos"
        :key="combo.id"
        class="product-card combo-card"
        @click="$emit('add-combo', combo)"
      >
        <i class="fas fa-box-open product-icon"></i>
        <div class="product-name">{{ combo.nombre }}</div>
        <div class="product-price combo-price">Bs {{ combo.precio.toFixed(2) }}</div>
        <div class="combo-items-preview" v-if="combo.combo_productos.length">
          <span
            v-for="cp in combo.combo_productos"
            :key="cp.producto_id"
            class="combo-item-tag"
          >
            {{ cp.cantidad }}× {{ cp.producto?.nombre ?? `#${cp.producto_id}` }}
          </span>
        </div>
      </div>
      <div v-if="combosActivos.length === 0" class="empty-combos">
        <i class="fas fa-box-open" style="font-size:32px;color:#ccc;margin-bottom:8px;"></i>
        <p>No hay combos activos</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Producto } from '@/services/producto_service'
import type { Combo }    from '@/services/combo_service'

interface Bebida {
  producto_id: number
  stock:       number
  agotado:     boolean
}

const props = defineProps<{
  productos:    Producto[]
  bebidas:      Bebida[]
  combosActivos: Combo[]
  turnoActivo:  boolean
}>()

defineEmits<{
  (e: 'add-producto', p: Producto): void
  (e: 'add-combo',   c: Combo):    void
  (e: 'open-mitad'):               void
  (e: 'open-stock',  p: Producto): void
}>()


const ID_CAT_PIZZAS  = 1
const ID_CAT_BEBIDAS = 2
const ID_CAT_COMBOS  = -1

const CATEGORIAS = [
  { id: 0,              nombre: 'TODOS'   },
  { id: ID_CAT_PIZZAS,  nombre: 'PIZZAS'  },
  { id: ID_CAT_BEBIDAS, nombre: 'BEBIDAS' },
  { id: ID_CAT_COMBOS,  nombre: 'COMBOS'  },
]

const ICONO_POR_CATEGORIA: Record<number, string> = {
  [ID_CAT_PIZZAS]:  'fa-pizza-slice',
  [ID_CAT_BEBIDAS]: 'fa-glass-cheers',
}


const filtroActivo = ref<number>(0)

const productosFiltrados = computed(() =>
  filtroActivo.value === 0
    ? props.productos.filter(p => p.activo)
    : props.productos.filter(p => p.activo && p.categoria_id === filtroActivo.value)
)


const getIconProducto = (p: Producto): string =>
  ICONO_POR_CATEGORIA[p.categoria_id] ?? 'fa-box'

const getBebidaInfo = (productoId: number) =>
  props.bebidas.find(b => b.producto_id === productoId)

const getStockClass = (id: number) => {
  const b = getBebidaInfo(id)
  if (!b)           return ''
  if (b.agotado)    return 'stock-agotado'
  if (b.stock <= 5) return 'stock-bajo'
  return 'stock-normal'
}

const getStockIcon = (id: number) => {
  const b = getBebidaInfo(id)
  if (!b)           return 'fa-question-circle'
  if (b.agotado)    return 'fa-times-circle'
  if (b.stock <= 5) return 'fa-exclamation-triangle'
  return 'fa-check-circle'
}

const getStockTexto = (id: number) => {
  const b = getBebidaInfo(id)
  if (!b)        return 'Sin stock'
  if (b.agotado) return 'Agotado'
  return `${b.stock} disp.`
}
</script>

<style scoped>
.products-section {
  background: #ffffff; border-radius: 15px;
  padding: 20px; border: 1px solid #e0e0e0;
}

.section-title {
  color: #000000; font-size: 20px; font-weight: 700;
  margin-bottom: 20px; padding-bottom: 10px;
  border-bottom: 3px solid #ff0000;
  display: flex; justify-content: space-between; align-items: center;
}

.product-count { font-size: 14px; color: #666; font-weight: 500; }

.category-row {
  display: flex; gap: 10px; margin-bottom: 20px;
  flex-wrap: wrap; align-items: center;
}

.category-tabs { display: flex; gap: 10px; flex-wrap: wrap; flex: 1; }

.category-tab {
  padding: 8px 20px; background: #000000; color: #ffffff;
  border: none; border-radius: 25px; cursor: pointer;
  font-weight: 600; transition: all 0.3s; font-size: 14px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.category-tab.active,
.category-tab:hover { background: #ff0000; }

.mitad-mitad-tab {
  padding: 8px 20px; background: #ff0000; color: #ffffff;
  border: none; border-radius: 25px; cursor: pointer;
  font-weight: 700; transition: all 0.3s; font-size: 14px;
  text-transform: uppercase; letter-spacing: 0.5px;
  display: flex; align-items: center; gap: 8px; white-space: nowrap;
}
.mitad-mitad-tab:hover:not(:disabled) {
  background: #cc0000; transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255,0,0,0.3);
}
.mitad-mitad-tab:disabled { opacity: 0.5; cursor: not-allowed; }

.products-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px; max-height: 600px; overflow-y: auto; padding-right: 10px;
}

.product-card {
  background: #ffffff; border: 2px solid #e0e0e0;
  border-radius: 12px; padding: 15px; text-align: center;
  cursor: pointer; transition: all 0.3s;
  position: relative; overflow: hidden;
}
.product-card:hover {
  border-color: #ff0000; transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(255,0,0,0.2);
}
.product-card::before {
  content: ""; position: absolute; top: 0; left: 0;
  width: 100%; height: 4px; background: #ff0000;
  transform: scaleX(0); transition: transform 0.3s;
}
.product-card:hover::before { transform: scaleX(1); }

.combo-card { border-color: #e08000; }
.combo-card::before { background: #e08000; }
.combo-card:hover { border-color: #e08000; box-shadow: 0 10px 20px rgba(224,128,0,0.25); }
.combo-card .product-icon { color: #e08000; }
.combo-price { color: #e08000 !important; }

.combo-items-preview {
  margin-top: 8px;
  display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;
}
.combo-item-tag {
  font-size: 10px; background: #fff3e0; color: #bf5e00;
  border-radius: 10px; padding: 2px 7px; font-weight: 600;
}

.empty-combos {
  grid-column: 1 / -1; text-align: center;
  color: #999; padding: 40px 20px;
  display: flex; flex-direction: column; align-items: center;
}

.product-icon  { font-size: 40px; color: #ff0000; margin-bottom: 10px; }
.product-name  { color: #000000; font-weight: 700; font-size: 16px; margin-bottom: 5px; }
.product-price { color: #ff0000; font-weight: 800; font-size: 18px; }

.bebida-info { display: flex; flex-direction: column; align-items: center; gap: 5px; }

.stock-badge {
  font-size: 11px; padding: 3px 8px; border-radius: 12px;
  display: inline-flex; align-items: center; gap: 3px; font-weight: 600;
}
.stock-badge.stock-normal  { background: #28a745; color: white; }
.stock-badge.stock-bajo    { background: #ffc107; color: #000; }
.stock-badge.stock-agotado { background: #dc3545; color: white; }

.inventory-btn {
  position: absolute; top: 5px; right: 5px;
  background: #000; color: #ff0000; border: none;
  width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.3s; opacity: 0; transform: scale(0.8);
}
.product-card:hover .inventory-btn { opacity: 1; transform: scale(1); }
.inventory-btn:hover { background: #ff0000; color: #fff; }

@media (max-width: 768px) {
  .category-row    { flex-direction: column; }
  .category-tabs   { justify-content: center; }
  .mitad-mitad-tab { width: 100%; justify-content: center; }
  .products-grid   { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .products-grid { grid-template-columns: 1fr; }
}
</style>