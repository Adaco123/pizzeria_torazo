<template>
  <div class="tab-shell">

    
    <div class="tab-header">
      <h3><i class="fas fa-pizza-slice"></i> GESTIÓN DE PRODUCTOS</h3>
      <div class="action-group">
        <button class="btn-primary" @click="showIngredientModal = true">
          <i class="fas fa-carrot"></i> NUEVO INGREDIENTE
        </button>
        <button class="btn-primary" @click="openProductModal">
          <i class="fas fa-plus"></i> NUEVO PRODUCTO
        </button>
      </div>
    </div>

    
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-pizza-slice"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Total productos</div>
          <div class="kpi-value">{{ productsStore.productos.length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-toggle-on"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Activos</div>
          <div class="kpi-value">{{ productsStore.productos.filter(p => p.activo).length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-wine-bottle"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Bebidas</div>
          <div class="kpi-value">{{ productsStore.productos.filter(p => p.categoria_id === 2).length }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon red-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Stock crítico</div>
          <div class="kpi-value red">{{ lowStockCount }}</div>
        </div>
      </div>
    </div>

    
    <div class="filters-bar">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input
          type="text"
          v-model="productSearch"
          placeholder="Buscar producto..."
        >
      </div>
      <select v-model="productCategoryFilter" class="filter-select">
        <option value="">Todas las categorías</option>
        <option value="pizzas">Pizzas</option>
        <option value="bebidas">Bebidas</option>
        <option value="entradas">Entradas</option>
        <option value="postres">Postres</option>
      </select>
    </div>

    
    <div class="dark-table-card">
      <div class="card-hd">
        <span class="card-title"><i class="fas fa-list"></i> LISTADO DE PRODUCTOS</span>
        <span class="card-count">{{ filteredProducts.length }} registros</span>
      </div>
      <div class="table-scroll">
        <table class="dark-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in filteredProducts" :key="product.id">
              <td class="mono">#{{ product.id }}</td>
              <td class="product-name-cell">
                <i :class="['fas', product.icon]"></i>
                <span class="bold-white">{{ product.name }}</span>
              </td>
              <td class="muted">{{ product.category }}</td>
              <td class="bold-white">Bs {{ product.price.toFixed(2) }}</td>
              <td>
                <span class="stock-pill" :class="getStockClass(product)">
                  {{ getStockText(product) }}
                </span>
              </td>
              <td>
                <span class="status-pill" :class="product.active ? 'pill-active' : 'pill-inactive'">
                  {{ product.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn-table btn-edit" @click="editProduct(product)">
                    <i class="fas fa-edit"></i> EDITAR
                  </button>
                  <button class="btn-table btn-delete" @click="deleteProduct(product)">
                    <i class="fas fa-trash-alt"></i> ELIMINAR
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredProducts.length">
              <td colspan="7" class="empty-row">
                <i class="fas fa-pizza-slice"></i> No hay productos registrados
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    
    <AddProducto
      :show="showProductModal"
      @close="closeProductModal"
    />

    
    <AddIngrediente
      :show="showIngredientModal"
      @close="showIngredientModal = false"
      @saved="onIngredientSaved"
    />

    
    <PutProducto
      :show="showPutProducto"
      :productoId="selectedProductId"
      @close="closePutProducto"
    />

    
    <BebidasStockModal
      :show="showStockModal"
      :bebida="selectedProductForStock"
      @close="closeStockModal"
      @stock-updated="handleStockUpdated"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStoreProductos }    from '@/stores/productos/productos'
import { useBebidasStore }      from '@/stores/productos/bebidas'
import { useStoreIngredientes } from '@/stores/productos/ingredientes'
import { type Producto }        from '@/services/producto_service'
import AddProducto       from '@/components/panel_admin/add_producto.vue'
import AddIngrediente    from '@/components/panel_admin/add_ingrediente.vue'
import PutProducto       from '@/components/panel_admin/put_producto.vue'
import BebidasStockModal from '@/components/panel_cajero/add_bebida.vue'


interface ProductoTabla {
  id:           number
  name:         string
  category:     'pizzas' | 'bebidas' | 'entradas' | 'postres' | 'otros'
  price:        number
  active:       boolean
  icon:         string
  stock:        number
  categoria_id: number
  original?:    Producto
}

interface BebidaStockItem {
  producto_id: number
  nombre:      string
  stock:       number | null
  agotado:     boolean
}


const productsStore     = useStoreProductos()
const bebidasStore      = useBebidasStore()
const ingredientesStore = useStoreIngredientes()


const productSearch         = ref('')
const productCategoryFilter = ref('')
const showProductModal      = ref(false)
const showPutProducto       = ref(false)
const selectedProductId     = ref<number | null>(null)
const showIngredientModal   = ref(false)
const showStockModal        = ref(false)
const selectedProductForStock = ref<BebidaStockItem | null>(null)


const mapCategoria = (categoriaId: number): ProductoTabla['category'] => {
  switch (categoriaId) {
    case 1: return 'pizzas'
    case 2: return 'bebidas'
    case 3: return 'entradas'
    case 4: return 'postres'
    default: return 'otros'
  }
}


const filteredProducts = computed(() =>
  productsStore.productos
    .map(p => ({
      id:           p.id,
      name:         p.nombre,
      category:     mapCategoria(p.categoria_id),
      price:        p.precio_base,
      active:       p.activo,
      icon:         'fa-pizza-slice',
      stock:        p.stock ?? 0,
      categoria_id: p.categoria_id,
      original:     p
    }))
    .filter(p => {
      const matchesSearch   = p.name.toLowerCase().includes(productSearch.value.toLowerCase())
      const matchesCategory = !productCategoryFilter.value || p.category === productCategoryFilter.value
      return matchesSearch && matchesCategory
    })
)

const lowStockCount = computed(() =>
  bebidasStore.bebidas.filter(b => b.stock !== null && b.stock <= 5).length
)


const getStockClass = (product: ProductoTabla) => {
  if (product.category !== 'bebidas') return 'stock-normal'
  const bebida = bebidasStore.bebidas.find(b => b.producto_id === product.id)
  if (!bebida) return ''
  if (bebida.agotado) return 'stock-agotado'
  if (bebida.stock !== null && bebida.stock <= 5) return 'stock-bajo'
  return 'stock-normal'
}

const getStockText = (product: ProductoTabla) => {
  if (product.category !== 'bebidas') return 'N/A'
  const bebida = bebidasStore.bebidas.find(b => b.producto_id === product.id)
  if (!bebida) return 'Sin stock'
  if (bebida.agotado) return 'Agotado'
  return `${bebida.stock ?? 0} unidades`
}


const openProductModal = () => {
  selectedProductId.value = null
  showProductModal.value  = true
}

const closeProductModal = async () => {
  showProductModal.value = false
  await productsStore.fetchProductos()
}

const closePutProducto = async () => {
  showPutProducto.value   = false
  selectedProductId.value = null
  await productsStore.fetchProductos()
}

const editProduct = (product: ProductoTabla): void => {
  selectedProductId.value = product.id
  showPutProducto.value   = true
}

const deleteProduct = (product: ProductoTabla): void => {
  if (confirm(`¿Estás seguro de eliminar el producto "${product.name}"?`)) {
    alert(`Producto ${product.id} eliminado (simulado)`)
  }
}

const onIngredientSaved = async (): Promise<void> => {
  showIngredientModal.value = false
  await Promise.all([
    ingredientesStore.fetchIngredientes(true),
    productsStore.fetchProductos(true)
  ])
}


const closeStockModal = () => {
  showStockModal.value          = false
  selectedProductForStock.value = null
}

const handleStockUpdated = async () => {
  await Promise.all([
    bebidasStore.fetchBebidas(),
    productsStore.fetchStockBebidas()
  ])
}
</script>

<style scoped>
.tab-shell { display: flex; flex-direction: column; gap: 18px; }


.tab-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 14px; border-bottom: 2px solid #ff0000; flex-wrap: wrap; gap: 12px;
}
.tab-header h3 {
  font-size: 16px; font-weight: 700; color: #000;
  text-transform: uppercase; display: flex; align-items: center; gap: 8px;
}
.tab-header h3 i { color: #ff0000; }

.action-group { display: flex; gap: 10px; flex-wrap: wrap; }

.btn-primary {
  padding: 8px 18px; background: #ff0000; color: #fff;
  border: none; border-radius: 50px; font-size: 12px; font-weight: 700;
  text-transform: uppercase; cursor: pointer; display: flex; align-items: center; gap: 6px;
  font-family: 'Montserrat', sans-serif; transition: all 0.2s;
}
.btn-primary:hover { background: #cc0000; transform: translateY(-1px); }


.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

.kpi-card {
  background: #000; border-radius: 12px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  border: 1px solid #222; transition: transform 0.2s, box-shadow 0.2s;
}
.kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(255,0,0,0.2); }

.kpi-icon {
  width: 44px; height: 44px; background: #ff0000; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kpi-icon.red-icon { background: #1a0000; border: 1px solid #ff0000; }
.kpi-icon i { font-size: 18px; color: #fff; }
.kpi-icon.red-icon i { color: #ff0000; }

.kpi-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
.kpi-value { font-size: 22px; font-weight: 800; color: #fff; }
.kpi-value.red { color: #ff0000; }


.filters-bar { display: flex; gap: 12px; flex-wrap: wrap; }

.search-box {
  flex: 1; position: relative; min-width: 220px;
}
.search-box i {
  position: absolute; left: 13px; top: 50%;
  transform: translateY(-50%); color: #555; font-size: 13px;
}
.search-box input {
  width: 100%; padding: 10px 13px 10px 38px;
  background: #000; border: 1px solid #222; border-radius: 10px;
  color: #fff; font-size: 13px; font-family: 'Montserrat', sans-serif;
  transition: border-color 0.2s;
}
.search-box input::placeholder { color: #444; }
.search-box input:focus { border-color: #ff0000; outline: none; }

.filter-select {
  padding: 10px 14px; background: #000; border: 1px solid #222;
  border-radius: 10px; color: #ccc; font-size: 13px; min-width: 180px;
  cursor: pointer; font-family: 'Montserrat', sans-serif;
}
.filter-select:focus { border-color: #ff0000; outline: none; }


.dark-table-card {
  background: #000; border-radius: 14px; border: 1px solid #222; overflow: hidden;
}
.card-hd {
  padding: 11px 16px; border-bottom: 1px solid #222;
  display: flex; align-items: center; justify-content: space-between;
}
.card-title {
  font-size: 12px; font-weight: 700; color: #ccc;
  text-transform: uppercase; letter-spacing: 0.5px;
  display: flex; align-items: center; gap: 7px;
}
.card-title i { color: #ff0000; }
.card-count { font-size: 12px; color: #555; }

.table-scroll { overflow-x: auto; }
.dark-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dark-table th {
  background: #111; color: #888; padding: 11px 14px;
  text-align: left; font-weight: 600; font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
}
.dark-table td { padding: 11px 14px; border-bottom: 1px solid #111; color: #ccc; }
.dark-table tbody tr:hover { background: #0d0d0d; }
.dark-table tbody tr:last-child td { border-bottom: none; }

.mono         { font-family: 'Courier New', monospace; font-size: 12px; }
.bold-white   { font-weight: 700; color: #fff; }
.muted        { color: #666; font-size: 12px; }

.product-name-cell { display: flex; align-items: center; gap: 8px; }
.product-name-cell i { color: #ff0000; font-size: 16px; }


.stock-pill {
  display: inline-block; padding: 3px 10px; border-radius: 50px;
  font-size: 11px; font-weight: 700;
}
.stock-pill.stock-normal  { background: rgba(40,167,69,0.15);  color: #28a745; border: 1px solid #28a745; }
.stock-pill.stock-bajo    { background: rgba(255,193,7,0.15);  color: #ffc107; border: 1px solid #ffc107; }
.stock-pill.stock-agotado { background: rgba(220,53,69,0.15);  color: #dc3545; border: 1px solid #dc3545; }


.status-pill {
  display: inline-block; padding: 3px 9px; border-radius: 50px;
  font-size: 11px; font-weight: 700;
}
.pill-active   { background: rgba(40,167,69,0.15); color: #28a745; border: 1px solid #28a745; }
.pill-inactive { background: rgba(255,255,255,0.05); color: #555; border: 1px solid #333; }


.action-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.btn-table {
  padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: 700;
  cursor: pointer; border: none; display: flex; align-items: center; gap: 4px;
  font-family: 'Montserrat', sans-serif; transition: all 0.2s; text-transform: uppercase;
}
.btn-edit   { background: #ff0000; color: #fff; }
.btn-edit:hover   { background: #cc0000; }
.btn-delete { background: #1a1a1a; color: #ccc; border: 1px solid #333; }
.btn-delete:hover { background: #2a2a2a; }

.empty-row { text-align: center; color: #555; padding: 30px; }
.empty-row i { margin-right: 8px; color: #ff0000; }


@media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .kpi-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .filters-bar { flex-direction: column; }
  .filter-select { width: 100%; }
  .action-group { width: 100%; }
  .btn-primary { flex: 1; justify-content: center; }
}
</style>