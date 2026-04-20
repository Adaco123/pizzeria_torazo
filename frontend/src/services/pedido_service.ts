import api from "./api";



export interface TipoEntrega {
  id:     number
  nombre: string
}

export interface EstadoPedido {
  id:     number
  nombre: string
}

export interface DetalleExtra {
  id:             number
  detalle_id:     number
  ingrediente_id: number
  tamano_id:      number | null
  cantidad:       number
  precio_extra:   number
}



export interface DetalleMitadExtra {
  id:               number
  detalle_mitad_id: number
  ingrediente_id:   number
  cantidad:         number
  ingrediente:      { id: number; nombre: string } | null
}

export interface DetalleMitad {
  id:          number
  detalle_id:  number
  mitad:       1 | 2
  producto_id: number
  producto:    { id: number; nombre: string } | null
  extras:      DetalleMitadExtra[]
}

export interface DetallePedido {
  id:              number
  pedido_id:       number
  producto_id:     number | null
  combo_id:        number | null
  tamano_id:       number | null
  cantidad:        number
  precio_unitario: number
  subtotal:        number
  is_mitad:        boolean
  notas:           string | null   
  extras:          DetalleExtra[]
  mitades:         DetalleMitad[]
  producto_nombre: string | null
  tamano_nombre:   string | null
}

export interface PedidoHistorialEstado {
  id:         number
  pedido_id:  number
  estado_id:  number
  usuario_id: number
  fecha:      string
}

export interface Pedido {
  id:                number
  fecha:             string
  updated_at:        string
  estado_id:         number
  tipo_entrega_id:   number
  direccion_entrega: string | null
  total:             number
  cliente_id:        number
  usuario_id:        number
  turno_id:          number
  estado:            EstadoPedido
  tipo_entrega:      TipoEntrega
  detalles:          DetallePedido[]
  historial:         PedidoHistorialEstado[]
}



export interface PedidoPayload {
  cliente_id:        number
  usuario_id:        number
  turno_id:          number
  tipo_entrega_id:   number
  direccion_entrega?: string
  estado_id?:        number
}

export interface DetallePedidoPayload {
  producto_id?:    number
  combo_id?:       number
  tamano_id?:      number
  cantidad:        number
  precio_unitario: number
  notas?:          string   
}



export interface DetalleMitadExtraPayload {
  ingrediente_id: number
  cantidad?:      number
}

export interface DetalleMitadPayload {
  mitad:       1 | 2
  producto_id: number
  extras?:     DetalleMitadExtraPayload[]
}

export interface DetalleMitadPizzaPayload {
  tamano_id: number
  cantidad?: number
  notas?:    string   
  mitades:   [DetalleMitadPayload, DetalleMitadPayload]
}

export interface DetalleExtraPayload {
  ingrediente_id: number
  cantidad?:      number
}

export interface CambiarEstadoPayload {
  estado: string
}



interface ApiResponse<T> {
  success:  boolean
  data:     T
  message?: string
}

interface ApiListResponse<T> {
  success: boolean
  data:    T[]
  count:   number
}

export const getPedidos = () =>
  api.get<ApiListResponse<Pedido>>("/api/v1.0/pedidos")

export const getPedido = (id: number) =>
  api.get<ApiResponse<Pedido>>(`/api/v1.0/pedidos/${id}`)

export const createPedido = (data: PedidoPayload) =>
  api.post<ApiResponse<Pedido>>("/api/v1.0/pedidos", data)

export const updatePedido = (id: number, data: Partial<PedidoPayload>) =>
  api.put<ApiResponse<Pedido>>(`/api/v1.0/pedidos/${id}`, data)

export const deletePedido = (id: number) =>
  api.delete<{ success: boolean; message: string }>(`/api/v1.0/pedidos/${id}`)

export const cambiarEstadoPedido = (id: number, data: CambiarEstadoPayload) =>
  api.patch<ApiResponse<Pedido>>(`/api/v1.0/pedidos/${id}/estado`, data)



export const addDetallePedido = (pedidoId: number, data: DetallePedidoPayload) =>
  api.post<ApiResponse<DetallePedido>>(`/api/v1.0/pedidos/${pedidoId}/detalles`, data)



export const addDetalleMitad = (pedidoId: number, data: DetalleMitadPizzaPayload) =>
  api.post<ApiResponse<DetallePedido>>(`/api/v1.0/pedidos/${pedidoId}/detalles/mitad`, data)



export const addExtraDetalle = (pedidoId: number, detalleId: number, data: DetalleExtraPayload) =>
  api.post<ApiResponse<DetalleExtra>>(`/api/v1.0/pedidos/${pedidoId}/detalles/${detalleId}/extras`, data)

export const deleteExtraDetalle = (pedidoId: number, detalleId: number, extraId: number) =>
  api.delete<{ success: boolean; message: string }>(`/api/v1.0/pedidos/${pedidoId}/detalles/${detalleId}/extras/${extraId}`)