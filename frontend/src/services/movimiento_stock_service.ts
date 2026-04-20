


import api from "./api"

export interface MovimientoStock {
  id:              number
  producto_id:     number
  producto_nombre: string | null
  usuario_id:      number
  usuario_nombre:  string | null
  turno_id:        number | null
  cantidad:        number
  stock_anterior:  number | null
  stock_nuevo:     number | null
  fecha:           string
}

export interface AgregarStockPayload {
  producto_id: number
  cantidad:    number
}

const BASE = '/api/stock/movimientos'


export const movimientoStockService = {
 
  
  agregarStock(payload: AgregarStockPayload): Promise<MovimientoStock> {
    return api.post<MovimientoStock>(BASE, payload).then(r => r.data)
  },
 
  
  getMovimientosPorProducto(
    productoId: number,
    limit = 10
  ): Promise<MovimientoStock[]> {
    return api
      .get<MovimientoStock[]>(`${BASE}/${productoId}`, { params: { limit } })
      .then(r => r.data)
  },
 
  
  getTodos(params?: { producto_id?: number; limit?: number }): Promise<MovimientoStock[]> {
    return api.get<MovimientoStock[]>(BASE, { params }).then(r => r.data)
  },
}
 
 