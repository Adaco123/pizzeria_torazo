import { useEffect, useRef, useState } from 'react'
import { clientesApi, metodosPagoApi, pedidosApi } from '../../api.ts'
import type { Cliente, MetodoPago, Pedido } from '../../api.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
import { estadoDe, TIPO_ENTREGA_ID } from '../pedidos/estados.ts'

interface EstadoCaja {
  /** El pedido que se está armando: el cajero siempre tiene uno abierto en pantalla. */
  borrador: Pedido
  clientes: Cliente[]
  mostrador: Cliente
  metodos: MetodoPago[]
  /** Ficha que recibirá el próximo pedido que se cobre (orientativo: la asigna el servidor). */
  proximaFicha: number
}

/** Cliente por defecto de la venta rápida en el mostrador. */
const MOSTRADOR = { nombre: 'Mostrador', telefono: '0', direccion: '-', nit: '0' }

export function esMostrador(cliente: Cliente): boolean {
  return cliente.nombre.trim().toLowerCase() === MOSTRADOR.nombre.toLowerCase()
}

async function cargarCaja(usuarioId: number, turnoId: number): Promise<EstadoCaja> {
  const [pedidos, listaClientes, metodos] = await Promise.all([
    pedidosApi.listarDelTurno(turnoId),
    clientesApi.listar(),
    metodosPagoApi.listar(),
  ])

  let clientes = listaClientes
  let mostrador = clientes.find(esMostrador)
  if (!mostrador) {
    mostrador = await clientesApi.crear(MOSTRADOR)
    clientes = [mostrador, ...clientes]
  }

  // Se retoma el borrador que ya había (por ejemplo tras recargar la página); si no hay, se abre uno.
  const borradorExistente = pedidos
    .filter((p) => p.usuario_id === usuarioId && estadoDe(p) === 'pendiente')
    .toSorted((a, b) => b.id - a.id)[0]
  const borrador =
    borradorExistente ??
    (await pedidosApi.crear({
      cliente_id: mostrador.id,
      usuario_id: usuarioId,
      turno_id: turnoId,
      tipo_entrega_id: TIPO_ENTREGA_ID.Local,
    }))

  const ultimaFicha = Math.max(0, ...pedidos.map((p) => p.numero_turno ?? 0))
  return { borrador, clientes, mostrador, metodos, proximaFicha: ultimaFicha + 1 }
}

/**
 * Estado de la pantalla de caja: el pedido en borrador, los clientes y los métodos de pago.
 * Llama a `recargar()` para empezar un pedido nuevo.
 */
export function useCaja(usuarioId: number, turnoId: number) {
  const [estado, setEstado] = useState<EstadoCaja | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const carga = useRef<{ clave: string; promesa: Promise<EstadoCaja> } | null>(null)

  useEffect(() => {
    let vigente = true
    const clave = `${usuarioId}:${turnoId}:${version}`

    // En desarrollo React ejecuta este efecto dos veces. Compartir la promesa evita abrir
    // dos borradores a la vez.
    if (carga.current?.clave !== clave) {
      carga.current = { clave, promesa: cargarCaja(usuarioId, turnoId) }
    }

    carga.current.promesa
      .then((cargado) => {
        if (!vigente) return
        setEstado(cargado)
        setError(null)
      })
      .catch((e: unknown) => {
        if (vigente && !esAbort(e)) setError(mensajeDeError(e))
      })

    return () => {
      vigente = false
    }
  }, [usuarioId, turnoId, version])

  function recargar(): void {
    // Se vacía el estado para no mostrar ni un instante el pedido anterior ya cobrado.
    setEstado(null)
    setError(null)
    setVersion((v) => v + 1)
  }

  /** Guarda el pedido que devolvió el servidor (tras agregar, quitar o cambiar algo). */
  function actualizarBorrador(pedido: Pedido): void {
    setEstado((actual) => (actual ? { ...actual, borrador: pedido } : actual))
  }

  /** Vuelve a pedir el borrador al servidor. */
  async function refrescar(): Promise<void> {
    if (!estado) return
    actualizarBorrador(await pedidosApi.obtener(estado.borrador.id))
  }

  function agregarCliente(cliente: Cliente): void {
    setEstado((actual) => (actual ? { ...actual, clientes: [cliente, ...actual.clientes] } : actual))
  }

  return {
    estado,
    error,
    cargando: estado === null && error === null,
    recargar,
    actualizarBorrador,
    refrescar,
    agregarCliente,
  }
}

export type CajaApi = ReturnType<typeof useCaja>
