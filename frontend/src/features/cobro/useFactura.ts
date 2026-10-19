import { useEffect, useState } from 'react'
import { facturasApi } from '../../api.ts'
import type { Factura } from '../../api.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'

/**
 * Factura activa (no anulada) de un pedido y cuántas anuladas tuvo.
 * Llama a `recargar()` tras emitir o anular.
 */
export function useFactura(pedidoId: number) {
  const [factura, setFactura] = useState<Factura | null>(null)
  const [anuladas, setAnuladas] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    facturasApi
      .listar({ signal: controller.signal })
      .then((facturas) => {
        // El backend no filtra facturas por pedido: se filtran aquí.
        const delPedido = facturas.filter((f) => f.pedido?.id === pedidoId)
        setFactura(delPedido.filter((f) => !f.anulada).toSorted((a, b) => b.id - a.id)[0] ?? null)
        setAnuladas(delPedido.filter((f) => f.anulada).length)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })

    return () => controller.abort()
  }, [pedidoId, version])

  function recargar(): void {
    setVersion((v) => v + 1)
  }

  return { factura, anuladas, cargando, error, recargar }
}

export type EstadoFactura = ReturnType<typeof useFactura>
