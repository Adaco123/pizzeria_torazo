import { request, requestData, type Opts } from '../api.ts'

export type TipoRepartidor = 'persona' | 'empresa'

export interface Repartidor {
  id: number
  nombre: string
  tipo: TipoRepartidor
  telefono: string | null
  activo: boolean
}

export interface RepartidorDatos {
  nombre?: string
  tipo?: TipoRepartidor
  telefono?: string | null
  activo?: boolean
}

export const repartidoresApi = {
  /** El cajero recibe solo los activos; el admin puede pedir todos. */
  listar(todos = false, opts: Opts = {}): Promise<Repartidor[]> {
    return requestData<Repartidor[]>('/api/v1.0/repartidores', {
      query: todos ? { todos: 1 } : undefined,
      ...opts,
    })
  },

  crear(data: RepartidorDatos): Promise<Repartidor> {
    return requestData<Repartidor>('/api/v1.0/repartidores', { method: 'POST', body: data })
  },

  actualizar(id: number, data: RepartidorDatos): Promise<Repartidor> {
    return requestData<Repartidor>(`/api/v1.0/repartidores/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/repartidores/${id}`, { method: 'DELETE' })
  },
}
