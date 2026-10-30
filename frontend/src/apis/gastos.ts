import { requestData, type Opts } from '../api.ts'

export interface GastoCaja {
  id: number
  turno_id: number
  fecha: string
  monto: number
  categoria: string
  categoria_nombre: string
  descripcion: string
  usuario: string | null
  anulado: boolean
  anulado_por: string | null
}

export interface ResumenGastos {
  total: number
  cantidad: number
  por_categoria: { categoria: string; nombre: string; cantidad: number; total: number }[]
}

export interface GastosDelTurno {
  gastos: GastoCaja[]
  resumen: ResumenGastos
  /** Lo máximo que un cajero puede sacar de la caja en un turno (el administrador no tiene tope). */
  tope_cajero: number
  categorias: { id: string; nombre: string }[]
}

export const gastosApi = {
  delTurno(turnoId: number, opts: Opts = {}): Promise<GastosDelTurno> {
    return requestData<GastosDelTurno>(`/api/v1.0/turnos/${turnoId}/gastos`, opts)
  },

  registrar(turnoId: number, data: { categoria: string; monto: number; descripcion: string }): Promise<GastoCaja> {
    return requestData<GastoCaja>(`/api/v1.0/turnos/${turnoId}/gastos`, { method: 'POST', body: data })
  },

  anular(gastoId: number): Promise<GastoCaja> {
    return requestData<GastoCaja>(`/api/v1.0/gastos/${gastoId}/anular`, { method: 'PATCH' })
  },
}
