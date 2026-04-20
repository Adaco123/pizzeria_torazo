import api from "./api";

export interface Rol {
  id:     number
  nombre: string
}

export interface Usuario {
  id:         number
  nombre:     string
  correo:     string
  rol:        string | null
  activo:     boolean
  cedula:     string
  codigo:     string | null
  created_at: string
}

export interface UsuarioPayload {
  nombre:   string
  correo:   string
  contra:   string
  rol_id:   number
  cedula:   string
  codigo?:  string
}

export interface UsuarioEditPayload {
  nombre?:  string
  rol_id?:  number
  codigo?:  string
  activo?:  boolean
}

export interface CambiarContrasenaPayload {
  contra_actual: string
  contra_nueva:  string
}

export const registrarUsuario = (data: UsuarioPayload) =>
  api.post<{ message: string; user: Usuario }>("/api/v1.0/registrar/", data)

export const getUsuarios = (params?: { rol?: string; activo?: boolean }) =>
  api.get<{ users: Usuario[] }>("/api/v1.0/list", { params })

export const getUsuarioMe = () =>
  api.get<{ user: Usuario }>("/api/v1.0/me")

export const updateUsuario = (id: number, data: UsuarioEditPayload) =>
  api.put<{ message: string; user: Usuario }>(`/api/v1.0/usuarios/${id}`, data)

export const cambiarContrasena = (data: CambiarContrasenaPayload) =>
  api.post<{ message: string }>("/api/v1.0/cambiar_contrasena", data)