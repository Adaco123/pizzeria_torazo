import { request, requestData, requestBlob, type Opts, ApiError } from '../api.ts'
import type { GastoCaja, ResumenGastos } from './gastos.ts'

export interface Turno {
  id: number
  usuario_id: number
  apertura: string
  cierre: string | null
  monto_inicio: number
  monto_cierre: number | null
  abierto: boolean
}

export interface TurnoCreate {
  usuario_id: number
  monto_inicio?: number
}

export interface TurnoUpdate {
  usuario_id?: number
  cierre?: string | null
  monto_inicio?: number
  monto_cierre?: number | null
}

export interface VentaTamano {
  cantidad: number
  subtotal: number
}

export interface VentaProducto {
  producto_id: number
  nombre: string
  categoria: string
  tamanos: Record<string, VentaTamano>
}

export interface ResumenTurno {
  turno_id: number
  usuario: string
  apertura: string
  cierre: string | null
  monto_inicio: number
  monto_cierre: number | null
  total_pedidos: number
  total_facturas: number
  total_subtotal: number
  total_impuesto: number
  total_vendido: number
  /** Cobrado por método de pago, neto de devoluciones. */
  pagos_por_metodo: Record<string, { cantidad: number; total: number }>
  envios: { pedidos: number; total: number }
  descuentos: { pedidos: number; total: number }
  por_repartidor: { repartidor: string; entregas: number; envios: number }[]
  efectivo_cobrado: number
  /** Lo que salió de la caja en gastos y retiros (ya descontado del efectivo esperado). */
  gastos_caja: number
  gastos: ResumenGastos & { lista: GastoCaja[] }
  /** Monto inicial + efectivo cobrado - gastos: lo que debería haber en la caja. */
  efectivo_esperado: number
  /** Contado - esperado. Null mientras el turno no tenga monto de cierre. */
  diferencia: number | null
  pizzas: VentaProducto[]
  bebidas: VentaProducto[]
  otros: VentaProducto[]
  combos: { combo_id: number; nombre: string; cantidad: number; subtotal: number }[]
  inventario_bebidas: {
    producto_id: number
    nombre: string
    vendidas: number
    stock_actual: number
  }[]
  movimientos_stock: {
    id: number
    producto_nombre: string
    usuario_nombre: string
    cantidad: number
    stock_anterior: number
    stock_nuevo: number
    fecha: string
  }[]
  top_extras: { ingrediente_id: number; nombre: string; cantidad: number; ingreso: number }[]
  ventas_por_hora: { hora: number; pedidos: number; subtotal: number }[]
}

const baseTurnos = '/api/v1.0/turnos'

export const turnosApi = {
  listar(opts: Opts = {}): Promise<Turno[]> {
    return requestData<Turno[]>(baseTurnos, opts)
  },

  /** Turnos sin cierre. */
  abiertos(opts: Opts = {}): Promise<Turno[]> {
    return requestData<Turno[]>(`${baseTurnos}/abiertos`, opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Turno> {
    return requestData<Turno>(`${baseTurnos}/${id}`, opts)
  },

  /**
   * Abre un turno. Si el usuario ya tiene uno abierto el backend responde 400 y el
   * turno existente viene en `(error as ApiError).body.data`.
   */
  abrir(data: TurnoCreate): Promise<Turno> {
    return requestData<Turno>(baseTurnos, { method: 'POST', body: data })
  },

  actualizar(id: number, data: TurnoUpdate): Promise<Turno> {
    return requestData<Turno>(`${baseTurnos}/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`${baseTurnos}/${id}`, { method: 'DELETE' })
  },

  cerrar(id: number, montoCierre: number): Promise<Turno> {
    return requestData<Turno>(`${baseTurnos}/${id}/cerrar`, {
      method: 'POST',
      body: { monto_cierre: montoCierre },
    })
  },

  resumen(id: number, opts: Opts = {}): Promise<ResumenTurno> {
    return requestData<ResumenTurno>(`${baseTurnos}/${id}/resumen`, opts)
  },

  /** PDF del resumen del turno. */
  resumenPdf(id: number, opts: Opts = {}): Promise<Blob> {
    return requestBlob(`${baseTurnos}/${id}/resumen-pdf`, opts)
  },
}

/** Turno ya abierto que el backend adjunta al rechazar `abrir()` con 400. */
export function turnoAbiertoDeError(error: ApiError): Turno | null {
  const body = error.body
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: Turno }).data
  }
  return null
}
