import { request, type Opts } from '../api.ts'
import type { Categoria } from './categorias.ts'
import type { Ingrediente } from './ingredientes.ts'
import type { Tamano } from './tamanos.ts'

export interface Producto {
  id: number
  nombre: string
  descripcion: string | null
  precio_base: number
  activo: boolean
  /** Se acabó (masa, ingrediente…): no se puede vender hasta desmarcarlo. */
  agotado: boolean
  /** Unidades disponibles. Solo las bebidas llevan stock; null = nunca se cargó. */
  stock?: number | null
  categoria_id: number
  categoria?: Categoria
}

export interface ProductoInput {
  nombre: string
  descripcion?: string | null
  precio_base: number
  activo?: boolean
  categoria_id: number
}

/** Precio de un producto en un tamaño (GET /productos/:id/tamanos). */
export interface ProductoTamanoPrecio {
  tamano_id: number
  tamano: string
  precio: number
}

export interface ProductoTamano {
  producto_id: number
  tamano_id: number
  precio: number
  tamano?: Tamano
}

export interface ProductoIngrediente {
  producto_id: number
  ingrediente_id: number
  ingrediente?: Ingrediente
}

export const productosApi = {
  listar(opts: Opts = {}): Promise<Producto[]> {
    return request<Producto[]>('/api/v1.0/productos/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Producto> {
    return request<Producto>(`/api/v1.0/productos/${id}`, opts)
  },

  crear(data: ProductoInput): Promise<Producto> {
    return request<Producto>('/api/v1.0/productos/', { method: 'POST', body: data })
  },

  actualizar(id: number, data: ProductoInput): Promise<Producto> {
    return request<Producto>(`/api/v1.0/productos/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/productos/${id}`, { method: 'DELETE' })
  },

  toggleActivo(id: number): Promise<Producto> {
    return request<Producto>(`/api/v1.0/productos/${id}/toggle-active`, { method: 'PATCH' })
  },

  /** Cocina, caja y administrador pueden marcar un producto como agotado (o volverlo a habilitar). */
  marcarAgotado(id: number, agotado: boolean): Promise<Producto> {
    return request<Producto>(`/api/v1.0/productos/${id}/agotado`, { method: 'PATCH', body: { agotado } })
  },

  // --- Tamaños y precios del producto ---------------------------------------
  tamanos(id: number, opts: Opts = {}): Promise<ProductoTamanoPrecio[]> {
    return request<ProductoTamanoPrecio[]>(`/api/v1.0/productos/${id}/tamanos`, opts)
  },

  asignarTamano(id: number, data: { tamano_id: number; precio: number }): Promise<ProductoTamano> {
    return request<ProductoTamano>(`/api/v1.0/productos/${id}/tamanos`, {
      method: 'POST',
      body: data,
    })
  },

  async quitarTamano(id: number, tamanoId: number): Promise<void> {
    await request(`/api/v1.0/productos/${id}/tamanos/${tamanoId}`, { method: 'DELETE' })
  },

  // --- Ingredientes base del producto ----------------------------------------
  ingredientes(id: number, opts: Opts = {}): Promise<ProductoIngrediente[]> {
    return request<ProductoIngrediente[]>(`/api/v1.0/productos/${id}/ingredientes`, opts)
  },

  asignarIngrediente(id: number, ingredienteId: number): Promise<ProductoIngrediente> {
    return request<ProductoIngrediente>(`/api/v1.0/productos/${id}/ingredientes`, {
      method: 'POST',
      body: { ingrediente_id: ingredienteId },
    })
  },

  async quitarIngrediente(id: number, ingredienteId: number): Promise<void> {
    await request(`/api/v1.0/productos/${id}/ingredientes/${ingredienteId}`, { method: 'DELETE' })
  },
}
