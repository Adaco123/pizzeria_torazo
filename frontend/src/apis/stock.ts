import { request, type Opts } from '../api.ts'

export interface StockBebida {
  producto_id: number
  nombre: string
  /** null = todavía no se cargó stock (cuenta como 0). */
  stock: number | null
}

export interface StockBebidaResumen extends StockBebida {
  agotado: boolean
  /** Unidades que llegaron desde las 00:00 de hoy (hora de Bolivia). */
  entradas_hoy: number
  /** Unidades vendidas hoy, neto de pedidos cancelados. */
  vendidas_hoy: number
}

export interface StockActualizado {
  message: string
  stock_actual: number
}

export interface MovimientoStock {
  id: number
  producto_id: number
  producto_nombre: string
  usuario_id: number
  usuario_nombre: string
  turno_id: number
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  /** Los ajustes llevan el motivo escrito; las ventas y devoluciones, la ficha. */
  motivo?: string | null
  /** entrada: llegó mercadería · venta: pedido cobrado · devolucion: pedido cancelado · ajuste: corrección. */
  tipo: 'entrada' | 'venta' | 'devolucion' | 'ajuste'
  fecha: string
}

export interface MovimientoStockInput {
  producto_id: number
  cantidad: number
}

export const stockApi = {
  /** Stock de todas las bebidas. */
  async bebidas(opts: Opts = {}): Promise<StockBebidaResumen[]> {
    const response = await request<{ data: StockBebidaResumen[] }>(
      '/api/v1.0/productos/stock/bebidas',
      opts,
    )
    return response.data
  },

  /** Stock de una bebida. Responde 400 si el producto no es una bebida. */
  obtener(productoId: number, opts: Opts = {}): Promise<StockBebida> {
    return request<StockBebida>(`/api/v1.0/productos/${productoId}/stock`, opts)
  },

  /** Suma `cantidad` (entero > 0) al stock de una bebida. */
  agregar(productoId: number, cantidad: number): Promise<StockActualizado> {
    return request<StockActualizado>(`/api/v1.0/productos/${productoId}/stock`, {
      method: 'POST',
      body: { cantidad },
    })
  },

  /** Corrige el stock (solo administrador): `cantidad` con signo y un motivo. */
  ajustar(data: { producto_id: number; cantidad: number; motivo: string }): Promise<MovimientoStock> {
    return request<MovimientoStock>('/api/stock/movimientos/ajuste', { method: 'POST', body: data })
  },

  // --- Historial de movimientos ---------------------------------------------------
  /** Registra una entrada de stock y la deja en el historial. */
  registrarMovimiento(data: MovimientoStockInput): Promise<MovimientoStock> {
    return request<MovimientoStock>('/api/stock/movimientos', { method: 'POST', body: data })
  },

  movimientos(
    filtros: { producto_id?: number; limit?: number } = {},
    opts: Opts = {},
  ): Promise<MovimientoStock[]> {
    return request<MovimientoStock[]>('/api/stock/movimientos', { query: filtros, ...opts })
  },

  movimientosDeProducto(
    productoId: number,
    limit?: number,
    opts: Opts = {},
  ): Promise<MovimientoStock[]> {
    return request<MovimientoStock[]>(`/api/stock/movimientos/${productoId}`, {
      query: { limit },
      ...opts,
    })
  },
}
