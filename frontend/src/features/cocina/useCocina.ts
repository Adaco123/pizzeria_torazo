import { useEffect, useState } from 'react'
import { combosApi, pedidosApi, turnosApi } from '../../api.ts'
import type { EstadoPedidoNombre, Pedido } from '../../api.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
import { estadoDe } from '../pedidos/estados.ts'

/** Cada cuántos milisegundos se pide la lista de pedidos de nuevo. */
export const INTERVALO_MS = 10_000

/** Estados que se muestran en la pantalla de cocina. */
export const ESTADOS_COCINA: EstadoPedidoNombre[] = ['confirmado', 'en_preparacion', 'listo']

/**
 * Pedidos de cocina: confirmados, en preparación o listos, de turnos que siguen abiertos
 * (así no se acumulan pedidos viejos de días anteriores). Se actualiza solo cada
 * `INTERVALO_MS` mientras la pestaña esté visible, y al volver a ella.
 */
export function useCocina() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualizadoEn, setActualizadoEn] = useState<number | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const opts = { signal: controller.signal }
    let temporizador: number | undefined
    let enCurso = false

    function programar() {
      temporizador = window.setTimeout(() => {
        if (document.visibilityState === 'visible') void cargar()
        else programar()
      }, INTERVALO_MS)
    }

    async function cargar() {
      if (enCurso) return
      enCurso = true
      try {
        const [lista, abiertos] = await Promise.all([
          pedidosApi.listar(opts),
          turnosApi.abiertos(opts),
        ])
        const turnosAbiertos = new Set(abiertos.map((t) => t.id))
        setPedidos(
          lista.filter((p) => {
            const estado = estadoDe(p)
            return turnosAbiertos.has(p.turno_id) && estado !== null && ESTADOS_COCINA.includes(estado)
          }),
        )
        setActualizadoEn(Date.now())
        // Si falla una vuelta se conservan los pedidos anteriores y se avisa del error.
        setError(null)
      } catch (e) {
        if (!esAbort(e)) setError(mensajeDeError(e))
      } finally {
        enCurso = false
        if (!controller.signal.aborted) {
          setCargando(false)
          window.clearTimeout(temporizador)
          programar()
        }
      }
    }

    function alVolverALaPestana() {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(temporizador)
        void cargar()
      }
    }

    document.addEventListener('visibilitychange', alVolverALaPestana)
    void cargar()

    return () => {
      controller.abort()
      window.clearTimeout(temporizador)
      document.removeEventListener('visibilitychange', alVolverALaPestana)
    }
  }, [version])

  function recargar(): void {
    setVersion((v) => v + 1)
  }

  return { pedidos, cargando, error, actualizadoEn, recargar }
}

/** id de combo → nombre, para mostrar qué combo pidieron. */
export function useNombresCombos(): Record<number, string> {
  const [nombres, setNombres] = useState<Record<number, string>>({})

  useEffect(() => {
    const controller = new AbortController()

    combosApi
      .listar({ signal: controller.signal })
      .then((combos) => setNombres(Object.fromEntries(combos.map((c) => [c.id, c.nombre]))))
      .catch(() => {
        /* sin nombres: se muestra "Combo #id" */
      })

    return () => controller.abort()
  }, [])

  return nombres
}

/** Hora actual en milisegundos, refrescada cada `intervaloMs` (para los "hace X min"). */
export function useAhora(intervaloMs = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), intervaloMs)
    return () => window.clearInterval(id)
  }, [intervaloMs])

  return ahora
}