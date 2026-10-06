import { useEffect, useState } from 'react'
import { authApi, turnosApi } from '../../api.ts'
import type { Turno } from '../../api.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'

/** Carga la lista de turnos (más recientes primero). Llama a `recargar()` tras cambiar algo. */
export function useTurnos() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    turnosApi
      .listar({ signal: controller.signal })
      .then((datos) => {
        setTurnos(datos)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })

    return () => controller.abort()
  }, [version])

  function recargar(): void {
    setVersion((v) => v + 1)
  }

  return { turnos, cargando, error, recargar }
}

/** id → nombre de usuario, para que el administrador vea quién abrió cada turno. */
export function useNombresUsuarios(activo: boolean): Record<number, string> {
  const [nombres, setNombres] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!activo) return
    const controller = new AbortController()

    authApi
      .listarUsuarios({}, { signal: controller.signal })
      .then((usuarios) => {
        setNombres(Object.fromEntries(usuarios.map((u) => [u.id, u.nombre])))
      })
      .catch(() => {
        /* sin nombres: la tabla muestra "Usuario #id" */
      })

    return () => controller.abort()
  }, [activo])

  return nombres
}