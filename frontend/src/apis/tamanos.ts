import { request, type Opts } from '../api.ts'

export interface Tamano {
  id: number
  nombre: string
}

export interface TamanoInput {
  nombre: string
}

export const tamanosApi = {
  listar(opts: Opts = {}): Promise<Tamano[]> {
    return request<Tamano[]>('/api/v1.0/tamanos/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Tamano> {
    return request<Tamano>(`/api/v1.0/tamanos/${id}`, opts)
  },

  crear(data: TamanoInput): Promise<Tamano> {
    return request<Tamano>('/api/v1.0/tamanos/', { method: 'POST', body: data })
  },

  actualizar(id: number, data: TamanoInput): Promise<Tamano> {
    return request<Tamano>(`/api/v1.0/tamanos/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/tamanos/${id}`, { method: 'DELETE' })
  },
}
