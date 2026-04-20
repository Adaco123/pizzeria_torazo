import api from "./api";

export interface Cliente {
  id:         number
  nombre:     string
  telefono?:  string
  direccion?: string
  correo?:    string
  nit?:       string
  activo:     boolean
  created_at: string
  updated_at: string
}

export interface ClientePayload {
  nombre:    string
  telefono?: string
  direccion?: string
  correo?:   string
  nit?:      string
}

export const getClientes = () =>
  api.get<Cliente[]>("/api/v1.0/clientes/")

export const getCliente = (id: number) =>
  api.get<Cliente>(`/api/v1.0/clientes/${id}`)

export const createCliente = (data: ClientePayload) =>
  api.post<{ message: string, cliente: Cliente }>("/api/v1.0/clientes/", data)

export const updateCliente = (id: number, data: Partial<ClientePayload>) =>
  api.put<{ message: string, cliente: Cliente }>(`/api/v1.0/clientes/${id}`, data)

export const deleteCliente = (id: number) =>
  api.delete<{ message: string }>(`/api/v1.0/clientes/${id}`)