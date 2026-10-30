import { request, type Opts } from '../api.ts'

export interface Ingrediente {
  id: number
  nombre: string
  precio_extra: number
  activo: boolean
}

export interface IngredienteInput {
  nombre: string
  precio_extra?: number
  activo?: boolean
}

export interface IngredienteTamano {
  ingrediente_id: number
  tamano_id: number
  precio_extra: number
}

export const ingredientesApi = {
  listar(opts: Opts = {}): Promise<Ingrediente[]> {
    return request<Ingrediente[]>('/api/v1.0/ingredientes/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Ingrediente> {
    return request<Ingrediente>(`/api/v1.0/ingredientes/${id}`, opts)
  },

  crear(data: IngredienteInput): Promise<Ingrediente> {
    return request<Ingrediente>('/api/v1.0/ingredientes/', { method: 'POST', body: data })
  },

  actualizar(id: number, data: Partial<IngredienteInput>): Promise<Ingrediente> {
    return request<Ingrediente>(`/api/v1.0/ingredientes/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/ingredientes/${id}`, { method: 'DELETE' })
  },

  // --- Precio extra por tamaño ------------------------------------------------
  listarPreciosPorTamano(opts: Opts = {}): Promise<IngredienteTamano[]> {
    return request<IngredienteTamano[]>('/api/v1.0/ingredientes/tamanos/', opts)
  },

  obtenerPrecioPorTamano(
    ingredienteId: number,
    tamanoId: number,
    opts: Opts = {},
  ): Promise<IngredienteTamano> {
    return request<IngredienteTamano>(
      `/api/v1.0/ingredientes/${ingredienteId}/tamanos/${tamanoId}`,
      opts,
    )
  },

  crearPrecioPorTamano(data: IngredienteTamano): Promise<IngredienteTamano> {
    return request<IngredienteTamano>('/api/v1.0/ingredientes/tamanos/', {
      method: 'POST',
      body: data,
    })
  },

  actualizarPrecioPorTamano(
    ingredienteId: number,
    tamanoId: number,
    precioExtra: number,
  ): Promise<IngredienteTamano> {
    return request<IngredienteTamano>(
      `/api/v1.0/ingredientes/${ingredienteId}/tamanos/${tamanoId}`,
      {
        method: 'PUT',
        body: { ingrediente_id: ingredienteId, tamano_id: tamanoId, precio_extra: precioExtra },
      },
    )
  },

  async eliminarPrecioPorTamano(ingredienteId: number, tamanoId: number): Promise<void> {
    await request(`/api/v1.0/ingredientes/${ingredienteId}/tamanos/${tamanoId}`, {
      method: 'DELETE',
    })
  },
}
