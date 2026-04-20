import api from '@/services/api' 



export interface FacturaCliente {
  id:     number
  nombre: string
}

export interface FacturaUsuario {
  id:     number
  nombre: string
}

export interface FacturaPedido {
  id:    number
  total: number
}

export interface Factura {
  id:             number
  numero_factura: string
  pedido_id:      number
  cliente_id:     number
  usuario_id:     number
  fecha:          string          
  subtotal:       number
  descuento:      number
  impuesto:       number
  total:          number
  anulada:        boolean
  metodo_pago:    string | null
  cliente:        FacturaCliente | null
  usuario:        FacturaUsuario | null
  pedido:         FacturaPedido  | null
}



export interface CreateFacturaPayload {
  numero_factura: string
  pedido_id:      number
  cliente_id:     number
  usuario_id:     number
  subtotal?:      number   
  descuento?:     number
  impuesto?:      number
}

export interface UpdateFacturaPayload {
  numero_factura?: string
  descuento?:      number
  impuesto?:       number
  subtotal?:       number
}



interface ApiResponse<T> {
  success: boolean
  data:    T
}

interface ApiMessage {
  success: boolean
  message: string
  data:    Factura
}



const BASE = '/api/v1.0/facturas'


export const getFacturas = () =>
  api.get<ApiResponse<Factura[]>>(BASE)


export const getFactura = (id: number) =>
  api.get<ApiResponse<Factura>>(`${BASE}/${id}`)


export const createFactura = (payload: CreateFacturaPayload) =>
  api.post<ApiResponse<Factura>>(BASE, payload)


export const updateFactura = (id: number, payload: UpdateFacturaPayload) =>
  api.put<ApiResponse<Factura>>(`${BASE}/${id}`, payload)


export const anularFactura = (id: number) =>
  api.patch<ApiMessage>(`${BASE}/${id}/anular`)