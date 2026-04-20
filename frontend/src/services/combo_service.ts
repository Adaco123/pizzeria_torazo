import api from '@/services/api'



export interface ComboProducto {
  combo_id:    number
  producto_id: number
  cantidad:    number
  nombre?:     string        
  producto?: {
    id:           number
    nombre:       string
    precio_base:  number
    categoria_id: number
  }
}

export interface Combo {
  id:              number
  nombre:          string
  precio:          number
  activo:          boolean
  combo_productos: ComboProducto[]
  
  productos?:      ComboProductoItem[]
}


export interface ComboProductoItem {
  producto_id: number
  nombre:      string
  cantidad:    number
}



export interface CreateComboPayload {
  nombre: string
  precio: number
  activo?: boolean
}

export interface UpdateComboPayload {
  precio?: number
  activo?: boolean
}

export interface AddProductoPayload {
  producto_id: number
  cantidad:    number
}

const BASE = '/api/v1.0/combos'




export const getCombos = () =>
  api.get<Combo[]>(`${BASE}/`)


export const getCombo = (id: number) =>
  api.get<Combo>(`${BASE}/${id}`)


export const getComboProductos = (id: number) =>
  api.get<ComboProducto[]>(`${BASE}/${id}/productos`)


export const createCombo = (payload: CreateComboPayload) =>
  api.post<Combo>(`${BASE}/`, payload)


export const updateCombo = (id: number, payload: UpdateComboPayload) =>
  api.put<Combo>(`${BASE}/${id}`, payload)


export const deleteCombo = (id: number) =>
  api.delete(`${BASE}/${id}`)


export const addProductoToCombo = (comboId: number, payload: AddProductoPayload) =>
  api.post<ComboProducto>(`${BASE}/${comboId}/productos`, payload)


export const updateProductoInCombo = (comboId: number, productoId: number, cantidad: number) =>
  api.put<ComboProducto>(`${BASE}/${comboId}/productos/${productoId}`, { cantidad })


export const removeProductoFromCombo = (comboId: number, productoId: number) =>
  api.delete(`${BASE}/${comboId}/productos/${productoId}`)