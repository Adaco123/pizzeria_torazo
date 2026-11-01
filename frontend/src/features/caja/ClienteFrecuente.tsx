import { History, Repeat } from 'lucide-react'
import { useState } from 'react'
import { clientesApi } from '../../apis/clientes.ts'
import type { Cliente, HistorialCliente } from '../../apis/clientes.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearFecha, formatearMonto } from '../../utils/formato.ts'
import { Hoja } from './Hoja.tsx'
import styles from './Ticket.module.css'

interface Props {
  cliente: Cliente
  pedidoId: number
  /** El pedido ya trae productos: repetir se suma a lo que hay, no lo reemplaza. */
  hayProductos: boolean
  ocupado: boolean
  /** Se llama después de agregar productos al borrador, para volver a leerlo. */
  onRepetido: () => Promise<void> | void
}

/** Historial del cliente elegido y el atajo "repetir su último pedido". */
export function ClienteFrecuente({ cliente, pedidoId, hayProductos, ocupado, onRepetido }: Props) {
  const toast = useToast()
  const [historial, setHistorial] = useState<HistorialCliente | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [repitiendo, setRepitiendo] = useState(false)

  async function abrirHistorial() {
    setAbierto(true)
    setCargando(true)
    try {
      setHistorial(await clientesApi.historial(cliente.id))
    } catch (e) {
      toast.error(e)
    } finally {
      setCargando(false)
    }
  }

  async function repetir() {
    if (hayProductos && !window.confirm('El pedido ya tiene productos. ¿Agregar también lo del último pedido?')) {
      return
    }
    setRepitiendo(true)
    try {
      const resultado = await clientesApi.repetirUltimo(cliente.id, pedidoId)
      await onRepetido()
      if (resultado.agregados === 0) {
        toast.error('No se pudo repetir nada: ' + resultado.omitidos.map((o) => `${o.nombre} (${o.motivo})`).join(', '))
      } else if (resultado.omitidos.length > 0) {
        toast.error(
          'Se repitió el pedido, pero faltó: ' + resultado.omitidos.map((o) => `${o.nombre} (${o.motivo})`).join(', '),
        )
      } else {
        toast.exito('Último pedido repetido con los precios de hoy')
      }
    } catch (e) {
      toast.error(e)
    } finally {
      setRepitiendo(false)
    }
  }

  return (
    <>
      <div className={styles.frecuente}>
        <button type="button" disabled={ocupado || repitiendo} onClick={repetir}>
          <Repeat size={14} aria-hidden="true" /> {repitiendo ? 'Repitiendo…' : 'Repetir último pedido'}
        </button>
        <button type="button" onClick={abrirHistorial}>
          <History size={14} aria-hidden="true" /> Historial
        </button>
      </div>

      {abierto && (
        <Hoja titulo={`Historial de ${cliente.nombre}`} onCerrar={() => setAbierto(false)}>
          {cargando && !historial && <p className={styles.ayuda}>Cargando historial…</p>}
          {historial && historial.num_pedidos === 0 && (
            <p className={styles.ayuda}>{cliente.nombre} todavía no tiene pedidos cobrados.</p>
          )}
          {historial && historial.num_pedidos > 0 && (
            <>
              <p className={styles.resumenCliente}>
                <b>{historial.num_pedidos}</b> {historial.num_pedidos === 1 ? 'pedido' : 'pedidos'} · gastó{' '}
                <b>{formatearMonto(historial.total_gastado)}</b> · última compra {formatearFecha(historial.ultima_compra)}
              </p>
              <ul className={styles.historial}>
                {historial.pedidos.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <span>
                      {formatearFecha(p.fecha)} · {p.tipo_entrega ?? 'Local'} · <b>{formatearMonto(p.total)}</b>
                    </span>
                    <small>{p.resumen}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Hoja>
      )}
    </>
  )
}
