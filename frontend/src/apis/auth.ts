import { request, type Opts, tokenStorage } from '../api.ts'

/**
 * Tipos que reflejan los schemas de marshmallow del backend (`backend/app/*`).
 * Las fechas llegan como string ISO.
 */
/** ids de rol: el backend los crea en este orden (Administrador=1, Cajero=2, Pizzero=3, Mesero=4). */
export const ROL_ID = { Administrador: 1, Cajero: 2, Pizzero: 3, Mesero: 4 } as const

export type RolNombre = keyof typeof ROL_ID

export interface Usuario {
  id: number
  nombre: string
  correo: string
  rol?: string
  activo?: boolean
  cedula?: string
  codigo?: string | null
  created_at?: string
}

export interface LoginRequest {
  correo: string
  contra: string
}

export interface LoginResponse {
  access_token: string
  message: string
  rol: RolNombre | null
  nombre: string
  id: number
}

export interface RegistroRequest {
  nombre: string
  correo: string
  contra: string
  /** Entre 5 y 10 dígitos. */
  codigo: string
  cedula: string
  rol_id: number
}

export interface UsuarioEditRequest {
  nombre?: string
  rol_id?: number
  codigo?: string
  /** Solo un administrador puede cambiarlo. */
  activo?: boolean
  /** Solo un administrador puede cambiarlos. */
  correo?: string
  cedula?: string
}

export interface CambiarContrasenaRequest {
  contra_actual: string
  contra_nueva: string
}

export interface RolInfo {
  id: number
  nombre: string
}

export interface UsuarioAdmin {
  id: number
  nombre: string
  correo: string
  rol: string | null
  rol_id: number
  activo: boolean
  cedula?: string
  codigo?: string | null
}

export const authApi = {
  /** Inicia sesión y guarda el token para las siguientes peticiones. */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await request<LoginResponse>('/api/v1.0/login/', {
      method: 'POST',
      body: credentials,
    })
    tokenStorage.set(response.access_token)
    return response
  },

  logout(): void {
    tokenStorage.clear()
  },

  isAuthenticated(): boolean {
    return tokenStorage.get() !== null
  },

  /** Usuario de la sesión actual. Ojo: la ruta del backend es `/me`, sin prefijo `/api`. */
  async me(opts: Opts = {}): Promise<Usuario> {
    return (await request<{ user: Usuario }>('/me', opts)).user
  },

  async registrar(data: RegistroRequest): Promise<Usuario> {
    const response = await request<{ message: string; user: Usuario }>('/api/v1.0/registrar/', {
      method: 'POST',
      body: data,
    })
    return response.user
  },

  async editarUsuario(id: number, data: UsuarioEditRequest): Promise<Usuario> {
    const response = await request<{ message: string; user: Usuario }>(`/api/v1.0/usuarios/${id}`, {
      method: 'PUT',
      body: data,
    })
    return response.user
  },

  async cambiarContrasena(data: CambiarContrasenaRequest): Promise<void> {
    await request('/api/v1.0/cambiar_contrasena', { method: 'POST', body: data })
  },

  /** Lista usuarios, opcionalmente filtrando por nombre de rol y estado. */
  async listarUsuarios(
    filtros: { rol?: string; activo?: boolean } = {},
    opts: Opts = {},
  ): Promise<Usuario[]> {
    const response = await request<{ users: Usuario[] }>('/api/v1.0/list', {
      query: { rol: filtros.rol, activo: filtros.activo },
      ...opts,
    })
    return response.users
  },

  /** Listado de administración (rol como nombre limpio y `activo`). */
  async listarUsuariosAdmin(opts: Opts = {}): Promise<UsuarioAdmin[]> {
    return request<UsuarioAdmin[]>('/api/v1.0/usuarios', opts)
  },

  /** Roles que se pueden asignar (solo administrador). */
  async listarRoles(opts: Opts = {}): Promise<RolInfo[]> {
    return request<RolInfo[]>('/api/v1.0/roles', opts)
  },

  /** El administrador le pone una contraseña nueva a otro usuario. */
  async resetearContrasena(id: number, contraNueva: string): Promise<void> {
    await request(`/api/v1.0/usuarios/${id}/resetear-contrasena`, {
      method: 'POST',
      body: { contra_nueva: contraNueva },
    })
  },
}
