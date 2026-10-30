import { request, requestData, type Envelope, type Opts } from '../api.ts'
import type { PagoCobro, Pedido, TipoDescuento } from './pedidos.ts'

export interface ResumenCuenta {
  id: number
  estado: 'abierta' | 'cobrada' | 'anulada'
  abierta_en: string
  abierta_por: string | null
  cajero: string | null
  turno_id: number
  /** El turno donde se abrió ya se cerró: al cobrar o pedir más, pasa al turno abierto de hoy. */
  turno_cerrado: boolean
  pidio_cuenta: boolean
  rondas: number
  rondas_en_cocina: number
  rondas_listas: number
  total: number
}

export interface Mesa {
  id: number
  numero: number
  activa: boolean
  cuenta: ResumenCuenta | null
}

export interface CuentaMesa extends ResumenCuenta {
  mesa_id: number
  mesa_numero: number
  cerrada_en: string | null
  rondas_detalle: Pedido[]
  rondas_canceladas: number
  tope_descuento_cajero: number
}

export interface DescuentoCuenta {
  tipo: TipoDescuento
  valor: number
  motivo: string
}

export const mesasApi = {
  /** Plano de mesas con su cuenta abierta. `todas` (admin) incluye las desactivadas. */
  listar(todas = false, opts: Opts = {}): Promise<Mesa[]> {
    return requestData<Mesa[]>('/api/v1.0/mesas', { query: todas ? { todas: 1 } : undefined, ...opts })
  },

  crear(numero: number): Promise<Mesa> {
    return requestData<Mesa>('/api/v1.0/mesas', { method: 'POST', body: { numero } })
  },

  actualizar(id: number, data: { numero?: number; activa?: boolean }): Promise<Mesa> {
    return requestData<Mesa>(`/api/v1.0/mesas/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/mesas/${id}`, { method: 'DELETE' })
  },

  abrir(id: number): Promise<CuentaMesa> {
    return requestData<CuentaMesa>(`/api/v1.0/mesas/${id}/abrir`, { method: 'POST' })
  },

  cuenta(id: number, opts: Opts = {}): Promise<CuentaMesa> {
    return requestData<CuentaMesa>(`/api/v1.0/cuentas-mesa/${id}`, opts)
  },

  /** Borrador de la próxima ronda (el mismo si ya hay uno armándose). */
  nuevaRonda(cuentaId: number): Promise<Pedido> {
    return requestData<Pedido>(`/api/v1.0/cuentas-mesa/${cuentaId}/rondas`, { method: 'POST' })
  },

  enviarACocina(pedidoId: number): Promise<Pedido> {
    return requestData<Pedido>(`/api/v1.0/pedidos/${pedidoId}/enviar-a-cocina`, { method: 'POST' })
  },

  pedirCuenta(cuentaId: number, pidio = true): Promise<CuentaMesa> {
    return requestData<CuentaMesa>(`/api/v1.0/cuentas-mesa/${cuentaId}/pedir-cuenta`, {
      method: 'POST',
      body: { pidio },
    })
  },

  /** Cobra todas las rondas de una vez. Los pagos suman el total (ya con el descuento). */
  async cobrar(
    cuentaId: number,
    pagos: PagoCobro[],
    descuento?: DescuentoCuenta,
  ): Promise<{ cuenta: CuentaMesa; vuelto: number }> {
    const r = await request<Envelope<CuentaMesa> & { vuelto: number }>(
      `/api/v1.0/cuentas-mesa/${cuentaId}/cobrar`,
      { method: 'POST', body: { pagos, descuento } },
    )
    return { cuenta: r.data, vuelto: r.vuelto }
  },

  anular(cuentaId: number): Promise<CuentaMesa> {
    return requestData<CuentaMesa>(`/api/v1.0/cuentas-mesa/${cuentaId}/anular`, { method: 'POST' })
  },
}
