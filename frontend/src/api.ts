/**
 * Cliente HTTP del frontend (Pizzería Torazo): el puente con el backend.
 * Aquí solo vive lo común (URL, token, errores y las funciones `request*`).
 * Cada módulo de negocio (pedidos, turnos, mesas…) está en `src/apis/<modulo>.ts`
 * y usa este archivo para hablar con el servidor.
 * Uso: import { pedidosApi } from './apis/pedidos.ts'
 */

// ===========================================================================
// client
// ===========================================================================
/**
 * Cliente HTTP base. Todos los módulos de `src/apis/` pasan por aquí.
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

/** Opciones que aceptan las lecturas de cada módulo (para poder cancelarlas). */
export type Opts = Pick<RequestOptions, 'signal'>
