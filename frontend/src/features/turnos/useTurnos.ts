import { useEffect, useRef, useState } from 'react'
import { authApi } from '../../apis/auth.ts'
import { turnosApi } from '../../apis/turnos.ts'
import type { Turno } from '../../apis/turnos.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'

/** Cuántos turnos se piden cada vez en la lista de Turnos. */
const PAGINA = 20

/** Solo los turnos abiertos. Es lo que necesitan Pedidos y Mesas, sin cargar el historial. */
export function useTurnosAbiertos() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    turnosApi
      .abiertos({ signal: controller.signal })
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

/**
 * Historial de turnos (más recientes primero), de a 20. `verMas()` pide los siguientes.
 * `usuarioId` deja solo los turnos de ese usuario (el cajero ve solo los suyos).
 * `recargar()` vuelve a pedir lo que ya se había cargado.
 */
export function useTurnos(usuarioId?: number) {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const cargados = useRef(PAGINA)

  useEffect(() => {
    const controller = new AbortController()
    const limite = cargados.current

    turnosApi
      .listarPagina({ limit: limite + 1, offset: 0, usuarioId }, { signal: controller.signal })
      .then((datos) => {
        setTurnos(datos.slice(0, limite))
        setHayMas(datos.length > limite)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })

    return () => controller.abort()
  }, [version, usuarioId])

  function recargar(): void {
    setVersion((v) => v + 1)
  }

  async function verMas(): Promise<void> {
    setCargandoMas(true)
    try {
      const datos = await turnosApi.listarPagina({ limit: PAGINA + 1, offset: turnos.length, usuarioId })
      const conocidos = new Set(turnos.map((t) => t.id))
      const nuevos = datos.slice(0, PAGINA).filter((t) => !conocidos.has(t.id))
      setTurnos([...turnos, ...nuevos])
      setHayMas(datos.length > PAGINA && nuevos.length > 0)
      cargados.current = turnos.length + nuevos.length
    } catch (e: unknown) {
      setError(mensajeDeError(e))
    } finally {
      setCargandoMas(false)
    }
  }

  return { turnos, hayMas, cargando, cargandoMas, error, recargar, verMas }
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