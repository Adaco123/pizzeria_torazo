import { useEffect, useState, type ReactNode } from 'react'
import { ApiError, authApi, setUnauthorizedHandler, tokenStorage } from '../api.ts'
import type { RolNombre } from '../api.ts'
import { AuthContext, type AuthStatus, type Sesion } from './auth-context.ts'

const SESSION_KEY = 'torazo_session'

function leerSesion(): Sesion | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Sesion>
    if (typeof data.id !== 'number' || typeof data.nombre !== 'string') return null
    return { id: data.id, nombre: data.nombre, rol: data.rol ?? null }
  } catch {
    return null
  }
}

function guardarSesion(sesion: Sesion | null): void {
  try {
    if (sesion) localStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* almacenamiento no disponible: la sesión dura solo mientras la pestaña esté abierta */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Si hay token y datos guardados, arranca como "loading" mientras se valida contra el backend.
  const [sesion, setSesion] = useState<Sesion | null>(() =>
    tokenStorage.get() ? leerSesion() : null,
  )
  const [verificando, setVerificando] = useState(() => sesion !== null)

  const status: AuthStatus = verificando ? 'loading' : sesion ? 'authenticated' : 'anonymous'

  // Cualquier 401 del backend cierra la sesión (el cliente ya borró el token).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      guardarSesion(null)
      setSesion(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // Al cargar la app, comprueba que el token guardado siga siendo válido.
  useEffect(() => {
    if (!tokenStorage.get()) return
    const controller = new AbortController()

    authApi
      .me({ signal: controller.signal })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Sin conexión (status 0): se conserva la sesión y se reintenta en la siguiente petición.
        if (error instanceof ApiError && error.status === 0) return
        authApi.logout()
        guardarSesion(null)
        setSesion(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setVerificando(false)
      })

    return () => controller.abort()
  }, [])

  async function login(correo: string, contra: string): Promise<Sesion> {
    const respuesta = await authApi.login({ correo, contra })
    const nueva: Sesion = { id: respuesta.id, nombre: respuesta.nombre, rol: respuesta.rol }
    guardarSesion(nueva)
    setSesion(nueva)
    return nueva
  }

  function logout(): void {
    authApi.logout()
    guardarSesion(null)
    setSesion(null)
  }

  function hasRole(...roles: RolNombre[]): boolean {
    return sesion?.rol != null && roles.includes(sesion.rol)
  }

  return (
    <AuthContext value={{ status, sesion, login, logout, hasRole }}>{children}</AuthContext>
  )
}