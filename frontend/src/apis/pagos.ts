import { request, requestData, type Opts } from '../api.ts'

export interface MetodoPago {
  id: number
  nombre: string
}

export interface MetodoPagoInput {
  nombre: string
}

export interface Pago {
  id: number
  pedido_id: number
  /** null si el pago no tiene factura (la factura es opcional). */
  factura_id: number | null
  metodo_id: number
  monto: number
  monto_recibido: number | null
  vuelto: number
  fecha: string
  usuario_id: number
  metodo?: MetodoPago
}

export interface PagoCreate {
  factura_id: number
  metodo_id: number
  monto: number
  /** Obligatorio (y no menor al monto) cuando el método es "Efectivo". */
  monto_recibido?: number | null
  usuario_id: number
}

export const metodosPagoApi = {
  listar(opts: Opts = {}): Promise<MetodoPago[]> {
    return requestData<MetodoPago[]>('/api/v1.0/metodos-pago', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<MetodoPago> {
    return requestData<MetodoPago>(`/api/v1.0/metodos-pago/${id}`, opts)
  },

  crear(data: MetodoPagoInput): Promise<MetodoPago> {
    return requestData<MetodoPago>('/api/v1.0/metodos-pago', { method: 'POST', body: data })
  },

  actualizar(id: number, data: MetodoPagoInput): Promise<MetodoPago> {
    return requestData<MetodoPago>(`/api/v1.0/metodos-pago/${id}`, { method: 'PUT', body: data })
  },

  /** Responde 409 si el método ya tiene pagos asociados. */
  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/metodos-pago/${id}`, { method: 'DELETE' })
  },
}

export const pagosApi = {
  /** Todos los pagos, o solo los de una factura. */
  listar(filtros: { factura_id?: number } = {}, opts: Opts = {}): Promise<Pago[]> {
    return requestData<Pago[]>('/api/v1.0/pagos', { query: filtros, ...opts })
  },

  obtener(id: number, opts: Opts = {}): Promise<Pago> {
    return requestData<Pago>(`/api/v1.0/pagos/${id}`, opts)
  },

  /** No se puede pagar una factura anulada. En efectivo, `monto_recibido` es obligatorio. */
  crear(data: PagoCreate): Promise<Pago> {
    return requestData<Pago>('/api/v1.0/pagos', { method: 'POST', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/pagos/${id}`, { method: 'DELETE' })
  },
}
