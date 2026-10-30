import { requestData, type Opts } from '../api.ts'
import type { RefNombre } from './pedidos.ts'

export interface Factura {
  id: number
  numero_factura: string
  pedido_id: number
  cliente_id: number
  usuario_id: number
  fecha: string
  subtotal: number
  descuento: number
  impuesto: number
  total: number
  anulada: boolean
  cliente: RefNombre | null
  usuario: RefNombre | null
  pedido: { id: number; total: number } | null
  metodo_pago: string | null
}

export interface FacturaCreate {
  /** Entre 1 y 20 caracteres, único. */
  numero_factura: string
  pedido_id: number
  cliente_id: number
  usuario_id: number
  /** Si se omite o es null, el backend lo calcula desde el pedido. */
  subtotal?: number | null
  descuento?: number
  impuesto?: number
}

export type FacturaUpdate = Partial<FacturaCreate>

const baseFacturas = '/api/v1.0/facturas'

export const facturasApi = {
  listar(opts: Opts = {}): Promise<Factura[]> {
    return requestData<Factura[]>(baseFacturas, opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Factura> {
    return requestData<Factura>(`${baseFacturas}/${id}`, opts)
  },

  /** `numero_factura` repetido responde 409. */
  crear(data: FacturaCreate): Promise<Factura> {
    return requestData<Factura>(baseFacturas, { method: 'POST', body: data })
  },

  actualizar(id: number, data: FacturaUpdate): Promise<Factura> {
    return requestData<Factura>(`${baseFacturas}/${id}`, { method: 'PUT', body: data })
  },

  anular(id: number): Promise<Factura> {
    return requestData<Factura>(`${baseFacturas}/${id}/anular`, { method: 'PATCH' })
  },
}
