import { request, requestData, requestBlob, type Envelope, type Opts } from '../api.ts'
import type { TipoRepartidor } from './repartidores.ts'

export const ESTADOS_PEDIDO = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo',
  'entregado',
  'cancelado',
] as const

export type EstadoPedidoNombre = (typeof ESTADOS_PEDIDO)[number]

/** Tipos de entrega por defecto ("Local", "Domicilio"). Los ids vienen de la BD. */
export const TIPOS_ENTREGA = ['Local', 'Domicilio'] as const

export interface RefNombre {
  id: number
  nombre: string
}

export interface DetalleExtra {
  id: number
  detalle_id: number
  ingrediente_id: number
  tamano_id: number
  precio_extra: number
  cantidad: number
  ingrediente: RefNombre | null
}

export interface DetalleMitadExtra {
  id: number
  detalle_mitad_id: number
  ingrediente_id: number
  cantidad: number
  ingrediente: RefNombre | null
}

export interface DetalleMitad {
  id: number
  detalle_id: number
  mitad: 1 | 2
  producto_id: number
  producto: RefNombre | null
  extras: DetalleMitadExtra[]
}

export interface DetallePedido {
  id: number
  pedido_id: number
  producto_id: number | null
  combo_id: number | null
  tamano_id: number | null
  cantidad: number
  precio_unitario: number
  subtotal: number
  is_mitad: boolean
  notas: string | null
  extras: DetalleExtra[]
  mitades: DetalleMitad[]
  producto_nombre: string | null
  tamano_nombre: string | null
}

export type TipoDescuento = 'porcentaje' | 'monto'

export interface Pedido {
  id: number
  /** Ficha del pedido dentro del turno. Es null mientras es borrador: se asigna al cobrar. */
  numero_turno: number | null
  fecha: string
  updated_at: string
  estado_id: number
  tipo_entrega_id: number
  direccion_entrega: string | null
  total: number
  /** Dinero neto cobrado: pagos menos devoluciones. */
  pagado: number
  /** Solo si el pedido se canceló después de cobrarlo. */
  motivo_cancelacion: string | null
  /** Hora que se le prometió al cliente. Se fija al cobrar; null mientras es borrador. */
  hora_prometida: string | null
  /** Solo domicilio: lo que se cobra por llevarlo (ya está dentro de `total`). */
  costo_envio: number
  /** Bs que se descontaron de los productos (ya restados de `total`). */
  descuento: number
  descuento_tipo: TipoDescuento | null
  descuento_valor: number
  descuento_motivo: string | null
  repartidor_id: number | null
  repartidor: { id: number; nombre: string; tipo: TipoRepartidor; telefono: string | null } | null
  /** Solo rondas de una mesa: la cuenta a la que pertenecen y el número de mesa. */
  cuenta_id: number | null
  mesa_numero: number | null
  cliente_id: number
  usuario_id: number
  turno_id: number
  detalles: DetallePedido[]
  estado: RefNombre | null
  tipo_entrega: RefNombre | null
}

export interface PedidoCreate {
  cliente_id: number
  usuario_id: number
  tipo_entrega_id: number
  turno_id: number
  direccion_entrega?: string | null
}

/** Solo se puede cambiar mientras el pedido es borrador. El estado cambia con cobrar/cambiarEstado. */
export interface PedidoUpdate {
  cliente_id?: number
  tipo_entrega_id?: number
  direccion_entrega?: string | null
  /** Solo domicilio. Si el pedido pasa a Local el servidor los borra. */
  costo_envio?: number
  repartidor_id?: number | null
}

/** Un pago dentro del cobro de un pedido. En efectivo, `monto_recibido` es obligatorio. */
export interface PagoCobro {
  metodo_id: number
  monto: number
  monto_recibido?: number | null
}

export interface CobroRequest {
  /** La suma de los montos tiene que ser igual al total del pedido. */
  pagos: PagoCobro[]
  /** Minutos de espera que se prometen. Si no se envía, el servidor usa 20 (local) o 40 (domicilio). */
  minutos_espera?: number
}

export interface CobroResultado {
  /** El pedido ya cobrado, con su ficha (`numero_turno`) y en estado `confirmado`. */
  pedido: Pedido
  /** Vuelto total a entregar al cliente. */
  vuelto: number
}

/** Producto suelto o combo: se envía `producto_id` o `combo_id`, nunca ambos. */
export type DetallePedidoCreate = {
  cantidad: number
  tamano_id?: number | null
  precio_unitario?: number
  notas?: string | null
} & ({ producto_id: number; combo_id?: never } | { combo_id: number; producto_id?: never })

export interface DetalleMitadInput {
  mitad: 1 | 2
  producto_id: number
  extras?: { ingrediente_id: number; cantidad?: number }[]
}

/** Pizza mitad y mitad: exactamente dos mitades (una `1` y una `2`). */
export interface DetalleMitadCreate {
  tamano_id: number
  cantidad?: number
  notas?: string | null
  mitades: [DetalleMitadInput, DetalleMitadInput]
}

export interface DetalleExtraCreate {
  ingrediente_id: number
  cantidad?: number
}

const basePedidos = '/api/v1.0/pedidos'

export const pedidosApi = {
  listar(opts: Opts = {}): Promise<Pedido[]> {
    return requestData<Pedido[]>(basePedidos, opts)
  },

  /** Solo los pedidos de un turno (el cajero ya recibe solo los suyos). */
  listarDelTurno(turnoId: number, opts: Opts = {}): Promise<Pedido[]> {
    return requestData<Pedido[]>(basePedidos, { query: { turno_id: turnoId }, ...opts })
  },

  obtener(id: number, opts: Opts = {}): Promise<Pedido> {
    return requestData<Pedido>(`${basePedidos}/${id}`, opts)
  },

  crear(data: PedidoCreate): Promise<Pedido> {
    return requestData<Pedido>(basePedidos, { method: 'POST', body: data })
  },

  actualizar(id: number, data: PedidoUpdate): Promise<Pedido> {
    return requestData<Pedido>(`${basePedidos}/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`${basePedidos}/${id}`, { method: 'DELETE' })
  },

  /** Descuento de un borrador. El cajero llega hasta 10 %; más, solo el administrador. */
  ponerDescuento(id: number, data: { tipo: TipoDescuento; valor: number; motivo: string }): Promise<Pedido> {
    return requestData<Pedido>(`${basePedidos}/${id}/descuento`, { method: 'PUT', body: data })
  },

  quitarDescuento(id: number): Promise<Pedido> {
    return requestData<Pedido>(`${basePedidos}/${id}/descuento`, { method: 'DELETE' })
  },

  /**
   * Cambia el estado por nombre (`en_preparacion`, `listo`, `entregado`, `cancelado`).
   * Pasar de pendiente a confirmado no se hace aquí: ocurre al cobrar. Cancelar un pedido
   * ya cobrado exige `motivo`.
   */
  cambiarEstado(id: number, estado: EstadoPedidoNombre, motivo?: string): Promise<Pedido> {
    return requestData<Pedido>(`${basePedidos}/${id}/estado`, {
      method: 'PATCH',
      body: { estado, motivo },
    })
  },

  /**
   * Cobra el pedido completo y lo manda a cocina en una sola operación: registra los pagos,
   * descuenta el stock de bebidas y le asigna la ficha. Los pagos tienen que sumar el total.
   */
  async cobrar(id: number, data: CobroRequest): Promise<CobroResultado> {
    const respuesta = await request<Envelope<Pedido> & { vuelto: number }>(
      `${basePedidos}/${id}/cobrar`,
      { method: 'POST', body: data },
    )
    return { pedido: respuesta.data, vuelto: respuesta.vuelto }
  },

  /** Cambia la hora prometida de un pedido cobrado: `minutos` contados desde ahora. */
  async cambiarHoraPrometida(id: number, minutos: number): Promise<Pedido> {
    const respuesta = await request<Envelope<Pedido>>(`${basePedidos}/${id}/hora-prometida`, {
      method: 'PATCH',
      body: { minutos_espera: minutos },
    })
    return respuesta.data
  },

  // --- Detalles -----------------------------------------------------------------
  /** Agrega un producto o un combo. Devuelve el detalle creado. */
  agregarDetalle(id: number, data: DetallePedidoCreate): Promise<DetallePedido> {
    return requestData<DetallePedido>(`${basePedidos}/${id}/detalles`, { method: 'POST', body: data })
  },

  /** Agrega una pizza mitad y mitad. */
  agregarDetalleMitad(id: number, data: DetalleMitadCreate): Promise<DetallePedido> {
    return requestData<DetallePedido>(`${basePedidos}/${id}/detalles/mitad`, {
      method: 'POST',
      body: data,
    })
  },

  /** Quita un producto del pedido. Solo se puede mientras el pedido es borrador. */
  quitarDetalle(id: number, detalleId: number): Promise<Pedido> {
    return requestData<Pedido>(`${basePedidos}/${id}/detalles/${detalleId}`, { method: 'DELETE' })
  },

  /** Agrega un ingrediente extra a un detalle normal (no mitad y mitad). */
  agregarExtra(id: number, detalleId: number, data: DetalleExtraCreate): Promise<DetalleExtra> {
    return requestData<DetalleExtra>(`${basePedidos}/${id}/detalles/${detalleId}/extras`, {
      method: 'POST',
      body: data,
    })
  },

  async quitarExtra(id: number, detalleId: number, extraId: number): Promise<void> {
    await request(`${basePedidos}/${id}/detalles/${detalleId}/extras/${extraId}`, { method: 'DELETE' })
  },

  // --- Ticket -------------------------------------------------------------------
  /** PDF del ticket de cocina. Usa `URL.createObjectURL(blob)` para abrirlo o imprimirlo. */
  ticketCocina(id: number, opts: Opts = {}): Promise<Blob> {
    return requestBlob(`${basePedidos}/${id}/ticket-cocina`, opts)
  },

  /** PDF del ticket para el cliente (con precios y cómo pagó). Solo pedidos ya cobrados. */
  ticketCliente(id: number, opts: Opts = {}): Promise<Blob> {
    return requestBlob(`${basePedidos}/${id}/ticket-cliente`, opts)
  },
}
