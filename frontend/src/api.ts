/**
 * API del frontend (Pizzería Torazo) en un solo archivo.
 * Pegar como: frontend/src/api.ts
 * Uso: import { authApi, pedidosApi } from './api'
 */

// ===========================================================================
// client
// ===========================================================================
/**
 * Cliente HTTP base. Todos los módulos de más abajo pasan por aquí.
 *
 * - Lee la URL del backend de `VITE_API_URL`.
 * - Adjunta el JWT (`Authorization: Bearer ...`) si hay sesión.
 * - Normaliza los errores del backend (que usan `error`, `message`, `msg`
 *   o `errors` de marshmallow según el módulo) en un único `ApiError`.
 * - Soporta respuestas vacías (204) y descargas binarias (PDF).
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/+$/, '')

const TOKEN_KEY = 'torazo_token'

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* almacenamiento no disponible: la sesión dura solo en memoria de la pestaña */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* nada que limpiar */
    }
  },
}

let unauthorizedHandler: (() => void) | null = null

/** Registra qué hacer cuando el backend responde 401 (p. ej. redirigir al login). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  /** Código HTTP. `0` si no hubo respuesta (red caída, CORS, servidor apagado). */
  status: number
  /** Cuerpo de la respuesta ya parseado (útil p. ej. cuando el turno ya estaba abierto). */
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value) return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item)
      if (found) return found
    }
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const found = firstString(item)
      if (found) return found
    }
  }
  return undefined
}

function extractMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body) return body
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    for (const key of ['error', 'message', 'msg']) {
      const value = record[key]
      if (typeof value === 'string' && value) return value
    }
    // Errores de validación de marshmallow: { campo: ['mensaje'] } o { errors: {...} }
    return firstString(record.errors ?? record) ?? fallback
  }
  return fallback
}

// ---------------------------------------------------------------------------
// Petición
// ---------------------------------------------------------------------------
export type QueryValue = string | number | boolean | null | undefined
export type Query = Record<string, QueryValue>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers()
  const token = tokenStorage.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let body: string | undefined
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('No se pudo conectar con el servidor', 0, null)
  }

  if (!response.ok) {
    const parsed = await parseBody(response)
    if (response.status === 401) {
      tokenStorage.clear()
      unauthorizedHandler?.()
    }
    throw new ApiError(
      extractMessage(parsed, `Error ${response.status}`),
      response.status,
      parsed,
    )
  }
  return response
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Petición JSON. Devuelve `undefined as T` cuando el backend responde 204 / vacío. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  return (await parseBody(response)) as T
}

/** Petición que devuelve un archivo (tickets y resúmenes en PDF). */
export async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await send(path, options)
  return response.blob()
}

// ---------------------------------------------------------------------------
// Utilidades de forma de respuesta
// ---------------------------------------------------------------------------
/** Sobre `{ success, data }` que usan pedidos, turnos, facturas y pagos. */
export interface Envelope<T> {
  success: boolean
  message?: string
  data: T
  count?: number
}

export async function requestData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await request<Envelope<T>>(path, options)).data
}

type Opts = Pick<RequestOptions, 'signal'>

// ===========================================================================
// types
// ===========================================================================
/**
 * Tipos que reflejan los schemas de marshmallow del backend (`backend/app/*`).
 * Las fechas llegan como string ISO.
 */

// ---------------------------------------------------------------------------
// Constantes del backend
// ---------------------------------------------------------------------------
/** ids de rol: el backend los crea en este orden (Administrador=1, Cajero=2, Pizzero=3). */
export const ROL_ID = { Administrador: 1, Cajero: 2, Pizzero: 3 } as const
export type RolNombre = keyof typeof ROL_ID

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

// ---------------------------------------------------------------------------
// Usuarios y sesión
// ---------------------------------------------------------------------------
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
}

export interface CambiarContrasenaRequest {
  contra_actual: string
  contra_nueva: string
}

export interface UsuarioAdmin {
  id: number
  nombre: string
  correo: string
  rol: string | null
  activo: boolean
  cedula?: string
  codigo?: string | null
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
export interface Cliente {
  id: number
  nombre: string
  telefono: string
  direccion: string
  nit: string
  correo: string | null
  created_at?: string
}

export interface ClienteCreate {
  nombre: string
  telefono: string
  direccion: string
  nit: string
  correo?: string | null
}

/** El NIT no se puede modificar. */
export type ClienteUpdate = Partial<Omit<ClienteCreate, 'nit'>>

export interface ClienteTopCompras {
  nombre: string
  num_compras: number
  total_gastado: number
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------
export interface Categoria {
  id: number
  nombre: string
  activo: boolean
}

export interface CategoriaInput {
  nombre: string
  activo?: boolean
}

export interface Producto {
  id: number
  nombre: string
  descripcion: string | null
  precio_base: number
  activo: boolean
  categoria_id: number
  categoria?: Categoria
}

export interface ProductoInput {
  nombre: string
  descripcion?: string | null
  precio_base: number
  activo?: boolean
  categoria_id: number
}

export interface Tamano {
  id: number
  nombre: string
}

export interface TamanoInput {
  nombre: string
}

/** Precio de un producto en un tamaño (GET /productos/:id/tamanos). */
export interface ProductoTamanoPrecio {
  tamano_id: number
  tamano: string
  precio: number
}

export interface ProductoTamano {
  producto_id: number
  tamano_id: number
  precio: number
  tamano?: Tamano
}

export interface Ingrediente {
  id: number
  nombre: string
  precio_extra: number
  activo: boolean
}

export interface IngredienteInput {
  nombre: string
  precio_extra?: number
  activo?: boolean
}

export interface ProductoIngrediente {
  producto_id: number
  ingrediente_id: number
  ingrediente?: Ingrediente
}

export interface IngredienteTamano {
  ingrediente_id: number
  tamano_id: number
  precio_extra: number
}

export interface Combo {
  id: number
  nombre: string
  precio: number
  activo: boolean
}

export interface ComboInput {
  nombre: string
  precio: number
  activo?: boolean
}

/** Al editar un combo solo se pueden cambiar precio y activo. */
export interface ComboUpdate {
  precio?: number
  activo?: boolean
}

export interface ComboProducto {
  combo_id: number
  producto_id: number
  cantidad: number
  producto?: Producto
}

// ---------------------------------------------------------------------------
// Stock (bebidas)
// ---------------------------------------------------------------------------
export interface StockBebida {
  producto_id: number
  nombre: string
  stock: number
}

export interface StockBebidaResumen extends StockBebida {
  agotado: boolean
}

export interface StockActualizado {
  message: string
  stock_actual: number
}

export interface MovimientoStock {
  id: number
  producto_id: number
  producto_nombre: string
  usuario_id: number
  usuario_nombre: string
  turno_id: number
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  fecha: string
}

export interface MovimientoStockInput {
  producto_id: number
  cantidad: number
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
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

export interface Pedido {
  id: number
  numero_turno: number
  fecha: string
  updated_at: string
  estado_id: number
  tipo_entrega_id: number
  direccion_entrega: string | null
  total: number
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

export interface PedidoUpdate {
  estado_id?: number
  tipo_entrega_id?: number
  direccion_entrega?: string | null
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

// ---------------------------------------------------------------------------
// Turnos
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Facturas y pagos
// ---------------------------------------------------------------------------
export interface Factura {
  id: number
  numero_factura: string
  pedido_id: number
  cliente_id: number
  usuario_id: number
  fecha: string
  subtotal: number
  descuento: number
  impuesto: number
  total: number
  anulada: boolean
  cliente: RefNombre | null
  usuario: RefNombre | null
  pedido: { id: number; total: number } | null
  metodo_pago: string | null
}

export interface FacturaCreate {
  /** Entre 1 y 20 caracteres, único. */
  numero_factura: string
  pedido_id: number
  cliente_id: number
  usuario_id: number
  /** Si se omite o es null, el backend lo calcula desde el pedido. */
  subtotal?: number | null
  descuento?: number
  impuesto?: number
}

export type FacturaUpdate = Partial<FacturaCreate>

export interface MetodoPago {
  id: number
  nombre: string
}

export interface MetodoPagoInput {
  nombre: string
}

export interface Pago {
  id: number
  factura_id: number
  metodo_id: number
  monto: number
  monto_recibido: number | null
  vuelto: number
  fecha: string
  usuario_id: number
  metodo?: MetodoPago
}

export interface PagoCreate {
  factura_id: number
  metodo_id: number
  monto: number
  /** Obligatorio (y no menor al monto) cuando el método es "Efectivo". */
  monto_recibido?: number | null
  usuario_id: number
}

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------
export interface Estadisticas {
  total_usuarios: number
  total_clientes: number
  total_pedidos: number
  total_ventas: number
  pedidos_hoy: number
}

// ===========================================================================
// auth
// ===========================================================================
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
}

// ===========================================================================
// clientes
// ===========================================================================
export const clientesApi = {
  listar(opts: Opts = {}): Promise<Cliente[]> {
    return request<Cliente[]>('/api/v1.0/clientes/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Cliente> {
    return request<Cliente>(`/api/v1.0/clientes/${id}`, opts)
  },

  async crear(data: ClienteCreate): Promise<Cliente> {
    const response = await request<{ message: string; cliente: Cliente }>('/api/v1.0/clientes/', {
      method: 'POST',
      body: data,
    })
    return response.cliente
  },

  async actualizar(id: number, data: ClienteUpdate): Promise<Cliente> {
    const response = await request<{ message: string; cliente: Cliente }>(
      `/api/v1.0/clientes/${id}`,
      { method: 'PUT', body: data },
    )
    return response.cliente
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/clientes/${id}`, { method: 'DELETE' })
  },

  /** Solo administradores. */
  topCompras(opts: Opts = {}): Promise<ClienteTopCompras[]> {
    return request<ClienteTopCompras[]>('/api/v1.0/clientes/top-compras', opts)
  },
}

// ===========================================================================
// categorias
// ===========================================================================
export const categoriasApi = {
  async listar(opts: Opts = {}): Promise<Categoria[]> {
    const response = await request<{ message: string; data: Categoria[] }>(
      '/api/v1.0/categorias/',
      opts,
    )
    return response.data
  },

  obtener(id: number, opts: Opts = {}): Promise<Categoria> {
    return request<Categoria>(`/api/v1.0/categorias/${id}`, opts)
  },

  crear(data: CategoriaInput): Promise<Categoria> {
    return request<Categoria>('/api/v1.0/categorias/', { method: 'POST', body: data })
  },

  actualizar(id: number, data: CategoriaInput): Promise<Categoria> {
    return request<Categoria>(`/api/v1.0/categorias/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/categorias/${id}`, { method: 'DELETE' })
  },

  /** Activa o desactiva la categoría. */
  toggleActivo(id: number): Promise<Categoria> {
    return request<Categoria>(`/api/v1.0/categorias/${id}/toggle-active`, { method: 'PATCH' })
  },

  productos(id: number, opts: Opts = {}): Promise<Producto[]> {
    return request<Producto[]>(`/api/v1.0/categorias/${id}/productos`, opts)
  },
}

// ===========================================================================
// productos
// ===========================================================================
export const productosApi = {
  listar(opts: Opts = {}): Promise<Producto[]> {
    return request<Producto[]>('/api/v1.0/productos/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Producto> {
    return request<Producto>(`/api/v1.0/productos/${id}`, opts)
  },

  crear(data: ProductoInput): Promise<Producto> {
    return request<Producto>('/api/v1.0/productos/', { method: 'POST', body: data })
  },

  actualizar(id: number, data: ProductoInput): Promise<Producto> {
    return request<Producto>(`/api/v1.0/productos/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/productos/${id}`, { method: 'DELETE' })
  },

  toggleActivo(id: number): Promise<Producto> {
    return request<Producto>(`/api/v1.0/productos/${id}/toggle-active`, { method: 'PATCH' })
  },

  // --- Tamaños y precios del producto ---------------------------------------
  tamanos(id: number, opts: Opts = {}): Promise<ProductoTamanoPrecio[]> {
    return request<ProductoTamanoPrecio[]>(`/api/v1.0/productos/${id}/tamanos`, opts)
  },

  asignarTamano(id: number, data: { tamano_id: number; precio: number }): Promise<ProductoTamano> {
    return request<ProductoTamano>(`/api/v1.0/productos/${id}/tamanos`, {
      method: 'POST',
      body: data,
    })
  },

  async quitarTamano(id: number, tamanoId: number): Promise<void> {
    await request(`/api/v1.0/productos/${id}/tamanos/${tamanoId}`, { method: 'DELETE' })
  },

  // --- Ingredientes base del producto ----------------------------------------
  ingredientes(id: number, opts: Opts = {}): Promise<ProductoIngrediente[]> {
    return request<ProductoIngrediente[]>(`/api/v1.0/productos/${id}/ingredientes`, opts)
  },

  asignarIngrediente(id: number, ingredienteId: number): Promise<ProductoIngrediente> {
    return request<ProductoIngrediente>(`/api/v1.0/productos/${id}/ingredientes`, {
      method: 'POST',
      body: { ingrediente_id: ingredienteId },
    })
  },

  async quitarIngrediente(id: number, ingredienteId: number): Promise<void> {
    await request(`/api/v1.0/productos/${id}/ingredientes/${ingredienteId}`, { method: 'DELETE' })
  },
}

// ===========================================================================
// tamanos
// ===========================================================================
export const tamanosApi = {
  listar(opts: Opts = {}): Promise<Tamano[]> {
    return request<Tamano[]>('/api/v1.0/tamanos/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Tamano> {
    return request<Tamano>(`/api/v1.0/tamanos/${id}`, opts)
  },

  crear(data: TamanoInput): Promise<Tamano> {
    return request<Tamano>('/api/v1.0/tamanos/', { method: 'POST', body: data })
  },

  actualizar(id: number, data: TamanoInput): Promise<Tamano> {
    return request<Tamano>(`/api/v1.0/tamanos/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/tamanos/${id}`, { method: 'DELETE' })
  },
}

// ===========================================================================
// ingredientes
// ===========================================================================
export const ingredientesApi = {
  listar(opts: Opts = {}): Promise<Ingrediente[]> {
    return request<Ingrediente[]>('/api/v1.0/ingredientes/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Ingrediente> {
    return request<Ingrediente>(`/api/v1.0/ingredientes/${id}`, opts)
  },

  crear(data: IngredienteInput): Promise<Ingrediente> {
    return request<Ingrediente>('/api/v1.0/ingredientes/', { method: 'POST', body: data })
  },

  actualizar(id: number, data: Partial<IngredienteInput>): Promise<Ingrediente> {
    return request<Ingrediente>(`/api/v1.0/ingredientes/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/ingredientes/${id}`, { method: 'DELETE' })
  },

  // --- Precio extra por tamaño ------------------------------------------------
  listarPreciosPorTamano(opts: Opts = {}): Promise<IngredienteTamano[]> {
    return request<IngredienteTamano[]>('/api/v1.0/ingredientes/tamanos/', opts)
  },

  obtenerPrecioPorTamano(
    ingredienteId: number,
    tamanoId: number,
    opts: Opts = {},
  ): Promise<IngredienteTamano> {
    return request<IngredienteTamano>(
      `/api/v1.0/ingredientes/${ingredienteId}/tamanos/${tamanoId}`,
      opts,
    )
  },

  crearPrecioPorTamano(data: IngredienteTamano): Promise<IngredienteTamano> {
    return request<IngredienteTamano>('/api/v1.0/ingredientes/tamanos/', {
      method: 'POST',
      body: data,
    })
  },

  actualizarPrecioPorTamano(
    ingredienteId: number,
    tamanoId: number,
    precioExtra: number,
  ): Promise<IngredienteTamano> {
    return request<IngredienteTamano>(
      `/api/v1.0/ingredientes/${ingredienteId}/tamanos/${tamanoId}`,
      {
        method: 'PUT',
        body: { ingrediente_id: ingredienteId, tamano_id: tamanoId, precio_extra: precioExtra },
      },
    )
  },

  async eliminarPrecioPorTamano(ingredienteId: number, tamanoId: number): Promise<void> {
    await request(`/api/v1.0/ingredientes/${ingredienteId}/tamanos/${tamanoId}`, {
      method: 'DELETE',
    })
  },
}

// ===========================================================================
// combos
// ===========================================================================
export const combosApi = {
  listar(opts: Opts = {}): Promise<Combo[]> {
    return request<Combo[]>('/api/v1.0/combos/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Combo> {
    return request<Combo>(`/api/v1.0/combos/${id}`, opts)
  },

  crear(data: ComboInput): Promise<Combo> {
    return request<Combo>('/api/v1.0/combos/', { method: 'POST', body: data })
  },

  /** Solo se pueden cambiar `precio` y `activo`. */
  actualizar(id: number, data: ComboUpdate): Promise<Combo> {
    return request<Combo>(`/api/v1.0/combos/${id}`, { method: 'PUT', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/combos/${id}`, { method: 'DELETE' })
  },

  toggleActivo(id: number): Promise<Combo> {
    return request<Combo>(`/api/v1.0/combos/${id}/toggle-active`, { method: 'PATCH' })
  },

  // --- Productos del combo ----------------------------------------------------
  productos(id: number, opts: Opts = {}): Promise<ComboProducto[]> {
    return request<ComboProducto[]>(`/api/v1.0/combos/${id}/productos`, opts)
  },

  agregarProducto(
    id: number,
    data: { producto_id: number; cantidad: number },
  ): Promise<ComboProducto> {
    return request<ComboProducto>(`/api/v1.0/combos/${id}/productos`, {
      method: 'POST',
      body: { combo_id: id, ...data },
    })
  },

  actualizarProducto(id: number, productoId: number, cantidad: number): Promise<ComboProducto> {
    return request<ComboProducto>(`/api/v1.0/combos/${id}/productos/${productoId}`, {
      method: 'PUT',
      body: { cantidad },
    })
  },

  async quitarProducto(id: number, productoId: number): Promise<void> {
    await request(`/api/v1.0/combos/${id}/productos/${productoId}`, { method: 'DELETE' })
  },
}

// ===========================================================================
// pedidos
// ===========================================================================
const basePedidos = '/api/v1.0/pedidos'

export const pedidosApi = {
  listar(opts: Opts = {}): Promise<Pedido[]> {
    return requestData<Pedido[]>(basePedidos, opts)
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

  /** Cambia el estado por nombre (`pendiente`, `en_preparacion`, `listo`, ...). */
  cambiarEstado(id: number, estado: EstadoPedidoNombre): Promise<Pedido> {
    return requestData<Pedido>(`${basePedidos}/${id}/estado`, { method: 'PATCH', body: { estado } })
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
}

// ===========================================================================
// turnos
// ===========================================================================
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

// ===========================================================================
// facturas
// ===========================================================================
const baseFacturas = '/api/v1.0/facturas'

export const facturasApi = {
  listar(opts: Opts = {}): Promise<Factura[]> {
    return requestData<Factura[]>(baseFacturas, opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Factura> {
    return requestData<Factura>(`${baseFacturas}/${id}`, opts)
  },

  /** `numero_factura` repetido responde 409. */
  crear(data: FacturaCreate): Promise<Factura> {
    return requestData<Factura>(baseFacturas, { method: 'POST', body: data })
  },

  actualizar(id: number, data: FacturaUpdate): Promise<Factura> {
    return requestData<Factura>(`${baseFacturas}/${id}`, { method: 'PUT', body: data })
  },

  anular(id: number): Promise<Factura> {
    return requestData<Factura>(`${baseFacturas}/${id}/anular`, { method: 'PATCH' })
  },
}

// ===========================================================================
// pagos
// ===========================================================================
export const metodosPagoApi = {
  listar(opts: Opts = {}): Promise<MetodoPago[]> {
    return requestData<MetodoPago[]>('/api/v1.0/metodos-pago', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<MetodoPago> {
    return requestData<MetodoPago>(`/api/v1.0/metodos-pago/${id}`, opts)
  },

  crear(data: MetodoPagoInput): Promise<MetodoPago> {
    return requestData<MetodoPago>('/api/v1.0/metodos-pago', { method: 'POST', body: data })
  },

  actualizar(id: number, data: MetodoPagoInput): Promise<MetodoPago> {
    return requestData<MetodoPago>(`/api/v1.0/metodos-pago/${id}`, { method: 'PUT', body: data })
  },

  /** Responde 409 si el método ya tiene pagos asociados. */
  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/metodos-pago/${id}`, { method: 'DELETE' })
  },
}

export const pagosApi = {
  /** Todos los pagos, o solo los de una factura. */
  listar(filtros: { factura_id?: number } = {}, opts: Opts = {}): Promise<Pago[]> {
    return requestData<Pago[]>('/api/v1.0/pagos', { query: filtros, ...opts })
  },

  obtener(id: number, opts: Opts = {}): Promise<Pago> {
    return requestData<Pago>(`/api/v1.0/pagos/${id}`, opts)
  },

  /** No se puede pagar una factura anulada. En efectivo, `monto_recibido` es obligatorio. */
  crear(data: PagoCreate): Promise<Pago> {
    return requestData<Pago>('/api/v1.0/pagos', { method: 'POST', body: data })
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/pagos/${id}`, { method: 'DELETE' })
  },
}

// ===========================================================================
// stock
// ===========================================================================
export const stockApi = {
  /** Stock de todas las bebidas. */
  async bebidas(opts: Opts = {}): Promise<StockBebidaResumen[]> {
    const response = await request<{ data: StockBebidaResumen[] }>(
      '/api/v1.0/productos/stock/bebidas',
      opts,
    )
    return response.data
  },

  /** Stock de una bebida. Responde 400 si el producto no es una bebida. */
  obtener(productoId: number, opts: Opts = {}): Promise<StockBebida> {
    return request<StockBebida>(`/api/v1.0/productos/${productoId}/stock`, opts)
  },

  /** Suma `cantidad` (entero > 0) al stock de una bebida. */
  agregar(productoId: number, cantidad: number): Promise<StockActualizado> {
    return request<StockActualizado>(`/api/v1.0/productos/${productoId}/stock`, {
      method: 'POST',
      body: { cantidad },
    })
  },

  // --- Historial de movimientos ---------------------------------------------------
  /** Registra una entrada de stock y la deja en el historial. */
  registrarMovimiento(data: MovimientoStockInput): Promise<MovimientoStock> {
    return request<MovimientoStock>('/api/stock/movimientos', { method: 'POST', body: data })
  },

  movimientos(
    filtros: { producto_id?: number; limit?: number } = {},
    opts: Opts = {},
  ): Promise<MovimientoStock[]> {
    return request<MovimientoStock[]>('/api/stock/movimientos', { query: filtros, ...opts })
  },

  movimientosDeProducto(
    productoId: number,
    limit?: number,
    opts: Opts = {},
  ): Promise<MovimientoStock[]> {
    return request<MovimientoStock[]>(`/api/stock/movimientos/${productoId}`, {
      query: { limit },
      ...opts,
    })
  },
}

// ===========================================================================
// admin
// ===========================================================================
export const adminApi = {
  estadisticas(opts: Opts = {}): Promise<Estadisticas> {
    return request<Estadisticas>('/api/v1.0/estadisticas', opts)
  },
}