import { useState } from 'react'
import { clientesApi } from '../../api.ts'
import type { Cliente, HistorialCliente } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearFecha, formatearMonto } from '../../utils/formato.ts'
import base from '../pedidos/Pedidos.module.css'
import styles from './Caja.module.css'

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

  async function cargar(): Promise<HistorialCliente | null> {
    setCargando(true)
    try {
      const datos = await clientesApi.historial(cliente.id)
      setHistorial(datos)
      return datos
    } catch (e) {
      toast.error(e)
      return null
    } finally {
      setCargando(false)
    }
  }

  async function alternar() {
    const siguiente = !abierto
    setAbierto(siguiente)
    if (siguiente) await cargar()
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
    <div className={styles.frecuente}>
      <div className={base.formRow}>
        <button className={base.secondary} type="button" disabled={ocupado || repitiendo} onClick={repetir}>
          {repitiendo ? 'Repitiendo…' : 'Repetir último pedido'}
        </button>
        <button className={base.link} type="button" onClick={alternar}>
          {abierto ? 'ocultar historial' : 'ver historial'}
        </button>
      </div>

      {abierto && (
        <div className={base.subCard}>
          {cargando && !historial && <p className={base.muted}>Cargando historial…</p>}
          {historial && historial.num_pedidos === 0 && (
            <p className={base.muted}>{cliente.nombre} todavía no tiene pedidos cobrados.</p>
          )}
          {historial && historial.num_pedidos > 0 && (
            <>
              <p>
                <strong>{historial.num_pedidos}</strong> {historial.num_pedidos === 1 ? 'pedido' : 'pedidos'} ·
                gastó <strong>{formatearMonto(historial.total_gastado)}</strong> · última compra{' '}
                {formatearFecha(historial.ultima_compra)}
              </p>
              <ul className={styles.historial}>
                {historial.pedidos.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <span>
                      {formatearFecha(p.fecha)} · {p.tipo_entrega ?? 'Local'} · <strong>{formatearMonto(p.total)}</strong>
                    </span>
                    <span className={base.muted}>{p.resumen}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
