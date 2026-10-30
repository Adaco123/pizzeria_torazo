import { request, type Opts } from '../api.ts'
import type { Producto } from './productos.ts'

export interface Categoria {
  id: number
  nombre: string
  activo: boolean
}

export interface CategoriaInput {
  nombre: string
  activo?: boolean
}

export const categoriasApi = {
  async listar(opts: Opts = {}): Promise<Categoria[]> {
    const response = await request<{ message: string; data: Categoria[] }>(
      '/api/v1.0/categorias/',
      opts,
    )
    return response.data
  },

  obtener(id: number, opts: Opts = {}): Promise<Categoria> {
    return request<Categoria>(`/api/v1.0/categorias/${id}`, opts)
  },

  crear(data: CategoriaInput): Promise<Categoria> {
    return request<Categoria>('/api/v1.0/categorias/', { method: 'POST', body: data })
  },

  actualizar(id: number, data: CategoriaInput): Promise<Categoria> {
    return request<Categoria>(`/api/v1.0/categorias/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/categorias/${id}`, { method: 'DELETE' })
  },

  /** Activa o desactiva la categoría. */
  toggleActivo(id: number): Promise<Categoria> {
    return request<Categoria>(`/api/v1.0/categorias/${id}/toggle-active`, { method: 'PATCH' })
  },

  productos(id: number, opts: Opts = {}): Promise<Producto[]> {
    return request<Producto[]>(`/api/v1.0/categorias/${id}/productos`, opts)
  },
}
