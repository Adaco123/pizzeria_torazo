import { request, type Opts } from '../api.ts'

export interface Estadisticas {
  total_usuarios: number
  total_clientes: number
  total_pedidos: number
  total_ventas: number
  pedidos_hoy: number
}

export const adminApi = {
  estadisticas(opts: Opts = {}): Promise<Estadisticas> {
    return request<Estadisticas>('/api/v1.0/estadisticas', opts)
  },
}
