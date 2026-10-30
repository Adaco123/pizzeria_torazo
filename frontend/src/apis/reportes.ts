import { request, type Opts } from '../api.ts'
import type { ClienteFrecuente } from './clientes.ts'

export interface ReporteVentas {
  desde: string
  hasta: string
  total_vendido: number
  pedidos: number
  ticket_promedio: number
  /** Dinero devuelto por pedidos cancelados después de cobrarlos. */
  total_devuelto: number
  por_dia: { fecha: string; pedidos: number; total: number }[]
  /** Neto cobrado por método (cobros menos devoluciones). */
  por_metodo: { metodo: string; cantidad: number; total: number }[]
  por_producto: { producto: string; cantidad: number; total: number }[]
  gastos: { total: number; por_categoria: { categoria: string; nombre: string; cantidad: number; total: number }[] }
  /** Envíos cobrados en el periodo. */
  envios: { pedidos: number; total: number }
  descuentos: { pedidos: number; total: number }
  por_repartidor: { repartidor: string; entregas: number; envios: number }[]
  mejores_clientes: ClienteFrecuente[]
  cancelaciones: {
    pedido_id: number
    ficha: number | null
    fecha: string
    total_devuelto: number
    motivo: string | null
    cajero: string | null
    cancelado_por: string | null
  }[]
}

export const reportesApi = {
  /** Fechas AAAA-MM-DD en horario de Bolivia. */
  ventas(desde: string, hasta: string, opts: Opts = {}): Promise<ReporteVentas> {
    return request<ReporteVentas>('/api/v1.0/reportes/ventas', { query: { desde, hasta }, ...opts })
  },
}
