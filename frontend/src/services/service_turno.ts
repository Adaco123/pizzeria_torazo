import api from "./api.ts"

export interface ComboVendido {
  combo_id: number
  nombre:   string
  cantidad: number
  subtotal: number
}
 
export interface MovimientoStockTurno {
  id:              number
  producto_nombre: string
  usuario_nombre:  string
  cantidad:        number
  stock_anterior:  number | null
  stock_nuevo:     number | null
  fecha:           string
}
 

 
export interface ResumenTurno {
  turno_id:       number
  usuario:        string
  apertura:       string
  cierre:         string | null
  monto_inicio:   number
  monto_cierre:   number | null
  total_pedidos:  number
  total_facturas: number
  total_subtotal: number
  total_impuesto: number
  total_vendido:  number
  pizzas:         ResumenProducto[]
  bebidas:        ResumenProducto[]
  otros:          ResumenProducto[]
  combos:         ComboVendido[]           
  inventario_bebidas:  InventarioBebida[]
  movimientos_stock:   MovimientoStockTurno[]  
  top_extras:     TopExtra[]
  ventas_por_hora: VentaHora[]
}
 
export interface TopExtra {
  ingrediente_id: number
  nombre:         string
  cantidad:       number
  ingreso:        number
}
 
export interface VentaHora {
  hora:     number
  pedidos:  number
  subtotal: number
}

export interface Turno {
    id:           number
    usuario_id:   number
    apertura:     string
    cierre:       string | null
    monto_inicio: number
    monto_cierre: number | null
    abierto:      boolean
}

export interface TurnoListResponse {
    success: boolean
    data:    Turno[]
    count:   number
}

export interface TurnoResponse {
    success: boolean
    data:    Turno
    message?: string
}


export const getTurnos = () =>
    api.get<TurnoListResponse>("/api/v1.0/turnos")


export const getTurnosAbiertos = () =>
    api.get<TurnoListResponse>("/api/v1.0/turnos/abiertos")


export const getTurno = (turno_id: number) =>
    api.get<TurnoResponse>(`/api/v1.0/turnos/${turno_id}`)


export const createTurno = (usuario_id: number, monto_inicio: number = 0) =>
    api.post<TurnoResponse>("/api/v1.0/turnos", { usuario_id, monto_inicio })


export const updateTurno = (
    turno_id: number,
    data: Partial<Pick<Turno, "monto_inicio" | "monto_cierre" | "cierre">>
) =>
    api.put<TurnoResponse>(`/api/v1.0/turnos/${turno_id}`, data)


export const cerrarTurno = (turno_id: number, monto_cierre: number) =>
    api.post<TurnoResponse>(`/api/v1.0/turnos/${turno_id}/cerrar`, { monto_cierre })


export const deleteTurno = (turno_id: number) =>
    api.delete<{ success: boolean; message: string }>(`/api/v1.0/turnos/${turno_id}`)

export interface ResumenTamano {
  cantidad: number
  subtotal: number
}

export interface ResumenProducto {
  producto_id: number
  nombre:      string
  categoria:   string
  tamanos:     Record<string, ResumenTamano>  
}

export interface InventarioBebida {
  producto_id:  number
  nombre:       string
  vendidas:     number
  stock_actual: number
}

export interface ResumenTurno {
  turno_id:       number
  usuario:        string
  apertura:       string
  cierre:         string | null
  monto_inicio:   number
  monto_cierre:   number | null
  total_pedidos:  number
  total_facturas: number
  total_subtotal: number
  total_impuesto: number
  total_vendido:  number
  pizzas:         ResumenProducto[]
  bebidas:        ResumenProducto[]
  otros:          ResumenProducto[]
  inventario_bebidas: InventarioBebida[]
}

export const getResumenTurno = (turnoId: number) =>
  api.get<{ success: boolean; data: ResumenTurno }>(`/api/v1.0/turnos/${turnoId}/resumen`)



export const getTurnoActual = () =>
  api.get<{ success: boolean; data: ResumenTurno }>(`/api/v1.0/turnos/actual`)



export interface ResumenAbiertosResponse {
  success: boolean
  data: ResumenTurno[]
  total_general: {
    total_vendido: number
    total_pedidos: number
    total_facturas: number
  }
}

export const getTurnosResumenAbiertos = () =>
  api.get<ResumenAbiertosResponse>(`/api/v1.0/turnos/resumen-abiertos`)


export const getResumenTurnoPdf = async (turnoId: number) => {
  const url = api.defaults.baseURL + `/api/v1.0/turnos/${turnoId}/resumen-pdf`
  const token = localStorage.getItem('token')
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Error al generar PDF')
  const blob = await res.blob()
  const pdfUrl = URL.createObjectURL(blob)
  window.open(pdfUrl, '_blank')
}