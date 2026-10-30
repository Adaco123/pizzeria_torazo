import { request, type Opts } from '../api.ts'
import type { Producto } from './productos.ts'

export interface Combo {
  id: number
  nombre: string
  precio: number
  activo: boolean
}

export interface ComboInput {
  nombre: string
  precio: number
  activo?: boolean
}

/** Al editar un combo solo se pueden cambiar precio y activo. */
export interface ComboUpdate {
  precio?: number
  activo?: boolean
}

export interface ComboProducto {
  combo_id: number
  producto_id: number
  cantidad: number
  producto?: Producto
}

export const combosApi = {
  listar(opts: Opts = {}): Promise<Combo[]> {
    return request<Combo[]>('/api/v1.0/combos/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Combo> {
    return request<Combo>(`/api/v1.0/combos/${id}`, opts)
  },

  crear(data: ComboInput): Promise<Combo> {
    return request<Combo>('/api/v1.0/combos/', { method: 'POST', body: data })
  },

  /** Solo se pueden cambiar `precio` y `activo`. */
  actualizar(id: number, data: ComboUpdate): Promise<Combo> {
    return request<Combo>(`/api/v1.0/combos/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/combos/${id}`, { method: 'DELETE' })
  },

  toggleActivo(id: number): Promise<Combo> {
    return request<Combo>(`/api/v1.0/combos/${id}/toggle-active`, { method: 'PATCH' })
  },

  // --- Productos del combo ----------------------------------------------------
  productos(id: number, opts: Opts = {}): Promise<ComboProducto[]> {
    return request<ComboProducto[]>(`/api/v1.0/combos/${id}/productos`, opts)
  },

  agregarProducto(
    id: number,
    data: { producto_id: number; cantidad: number },
  ): Promise<ComboProducto> {
    return request<ComboProducto>(`/api/v1.0/combos/${id}/productos`, {
      method: 'POST',
      body: { combo_id: id, ...data },
    })
  },

  actualizarProducto(id: number, productoId: number, cantidad: number): Promise<ComboProducto> {
    return request<ComboProducto>(`/api/v1.0/combos/${id}/productos/${productoId}`, {
      method: 'PUT',
      body: { cantidad },
    })
  },

  async quitarProducto(id: number, productoId: number): Promise<void> {
    await request(`/api/v1.0/combos/${id}/productos/${productoId}`, { method: 'DELETE' })
  },
}
