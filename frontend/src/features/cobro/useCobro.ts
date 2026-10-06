import { useEffect, useState } from 'react'
import { facturasApi, metodosPagoApi, pagosApi } from '../../api.ts'
import type { Factura, MetodoPago, Pago } from '../../api.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
import { redondear } from './facturacion.ts'

/**
 * Estado de cobro de un pedido: su factura activa (no anulada), los pagos de esa factura
 * y los métodos de pago disponibles. Llama a `recargar()` tras facturar, pagar o anular.
 */
export function useCobro(pedidoId: number) {
  const [factura, setFactura] = useState<Factura | null>(null)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [metodos, setMetodos] = useState<MetodoPago[]>([])
  const [anuladas, setAnuladas] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const opts = { signal: controller.signal }

    async function cargar() {
      try {
        // El backend no filtra facturas por pedido: se traen y se filtran aquí.
        const [facturas, listaMetodos] = await Promise.all([
          facturasApi.listar(opts),
          metodosPagoApi.listar(opts),
        ])
        const delPedido = facturas.filter((f) => f.pedido?.id === pedidoId)
        const activa = delPedido.filter((f) => !f.anulada).toSorted((a, b) => b.id - a.id)[0] ?? null
        const listaPagos = activa ? await pagosApi.listar({ factura_id: activa.id }, opts) : []

        setFactura(activa)
        setPagos(listaPagos)
        setMetodos(listaMetodos)
        setAnuladas(delPedido.filter((f) => f.anulada).length)
        setError(null)
      } catch (e) {
        if (!esAbort(e)) setError(mensajeDeError(e))
      } finally {
        if (!controller.signal.aborted) setCargando(false)
      }
    }

    void cargar()
    return () => controller.abort()
  }, [pedidoId, version])

  const pagado = redondear(pagos.reduce((suma, pago) => suma + pago.monto, 0))
  const pendiente = factura ? redondear(factura.total - pagado) : 0

  function recargar(): void {
    setVersion((v) => v + 1)
  }

  return { factura, pagos, metodos, anuladas, pagado, pendiente, cargando, error, recargar }
}

export type Cobro = ReturnType<typeof useCobro>