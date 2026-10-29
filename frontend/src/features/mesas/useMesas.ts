import { useCallback, useEffect, useState } from 'react'
import { mesasApi } from '../../api.ts'
import type { CuentaMesa, Mesa } from '../../api.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'

const REFRESCO_MS = 10_000

/** Plano de mesas; se actualiza solo para ver cuándo cocina deja algo listo o piden la cuenta. */
export function useMesas() {
  const [mesas, setMesas] = useState<Mesa[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    mesasApi
      .listar(false, { signal: controller.signal })
      .then((datos) => {
        setMesas(datos)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
    return () => controller.abort()
  }, [version])

  useEffect(() => {
    const id = window.setInterval(() => setVersion((v) => v + 1), REFRESCO_MS)
    return () => window.clearInterval(id)
  }, [])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { mesas, error, recargar }
}

/** Cuenta de una mesa con todas sus rondas; también se actualiza sola. */
export function useCuenta(id: number) {
  const [cuenta, setCuenta] = useState<CuentaMesa | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    mesasApi
      .cuenta(id, { signal: controller.signal })
      .then((dato) => {
        setCuenta(dato)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
    return () => controller.abort()
  }, [id, version])

  useEffect(() => {
    const idIntervalo = window.setInterval(() => setVersion((v) => v + 1), REFRESCO_MS)
    return () => window.clearInterval(idIntervalo)
  }, [])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { cuenta, error, recargar }
}
