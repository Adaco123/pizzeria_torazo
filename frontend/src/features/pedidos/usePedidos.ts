import { useEffect, useState } from 'react'
import { clientesApi, pedidosApi } from '../../api.ts'
import type { Cliente, Pedido } from '../../api.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'

/** Todos los pedidos. Llama a `recargar()` tras cambiar algo. */
export function usePedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    pedidosApi
      .listar({ signal: controller.signal })
      .then((datos) => {
        setPedidos(datos)
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

  return { pedidos, cargando, error, recargar }
}

/** Un pedido con sus detalles. */
export function usePedido(id: number) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    pedidosApi
      .obtener(id, { signal: controller.signal })
      .then((dato) => {
        setPedido(dato)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })

    return () => controller.abort()
  }, [id, version])

  function recargar(): void {
    setVersion((v) => v + 1)
  }

  return { pedido, cargando, error, recargar }
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    clientesApi
      .listar({ signal: controller.signal })
      .then(setClientes)
      .catch(() => {
        /* sin clientes: se muestran vacíos y el formulario avisa al intentar buscar */
      })

    return () => controller.abort()
  }, [version])

  function recargar(): void {
    setVersion((v) => v + 1)
  }

  return { clientes, recargar }
}