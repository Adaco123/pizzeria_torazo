import { ESTADOS_PEDIDO } from '../../apis/pedidos.ts'
import type { EstadoPedidoNombre, Pedido } from '../../apis/pedidos.ts'

export const ETIQUETA_ESTADO: Record<EstadoPedidoNombre, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

/** El backend no tiene endpoint para listar los tipos de entrega: Local=1 y Domicilio=2. */
export const TIPO_ENTREGA_ID = { Local: 1, Domicilio: 2 } as const
export type TipoEntregaNombre = keyof typeof TIPO_ENTREGA_ID

/** Estado del pedido como nombre conocido, o null si el backend mandó algo inesperado. */
export function estadoDe(pedido: Pick<Pedido, 'estado'>): EstadoPedidoNombre | null {
  const nombre = pedido.estado?.nombre
  return ESTADOS_PEDIDO.find((estado) => estado === nombre) ?? null
}

export function esFinal(estado: EstadoPedidoNombre | null): boolean {
  return estado === 'entregado' || estado === 'cancelado'
}