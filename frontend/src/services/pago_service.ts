import api from '@/services/api'

export interface MetodoPago {
  id: number
  nombre: string
}

export interface Pago {
  id: number
  factura_id: number
  metodo_id: number
  metodo: MetodoPago
  monto: number
  monto_recibido: number | null
  vuelto: number
  fecha: string
  usuario_id: number
}

export interface PagoPayload {
  factura_id: number
  metodo_id: number
  monto: number
  usuario_id: number
  monto_recibido?: number
}


export const getMetodosPago = async (): Promise<MetodoPago[]> => {
  const res = await api.get('/api/v1.0/metodos-pago')
  return res.data.data
}


export const getPagosByFactura = async (facturaId: number): Promise<Pago[]> => {
  const res = await api.get('/api/v1.0/pagos', { params: { factura_id: facturaId } })
  return res.data.data
}

export const crearPago = async (payload: PagoPayload): Promise<Pago> => {
  const res = await api.post('/api/v1.0/pagos', payload)
  return res.data.data
}

export const eliminarPago = async (pagoId: number): Promise<void> => {
  await api.delete(`/api/v1.0/pagos/${pagoId}`)
}