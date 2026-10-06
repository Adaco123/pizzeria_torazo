import { useEffect, useState } from 'react'
import { turnosApi } from '../../api.ts'
import type { ResumenTurno, VentaProducto } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { descargarBlob } from '../../utils/archivos.ts'
import {
  esAbort,
  formatearFecha,
  formatearMonto,
  mensajeDeError,
} from '../../utils/formato.ts'
import styles from './Turnos.module.css'

interface Props {
  turnoId: number
  onCerrar: () => void
}

function TablaVentas({ titulo, items }: { titulo: string; items: VentaProducto[] }) {
  const filas = items.flatMap((producto) =>
    Object.entries(producto.tamanos).map(([tamano, venta]) => ({
      clave: `${producto.producto_id}-${tamano}`,
      nombre: producto.nombre,
      tamano,
      ...venta,
    })),
  )
  if (filas.length === 0) return null

  return (
    <div>
      <h3>{titulo}</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Tamaño</th>
              <th>Cant.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.clave}>
                <td>{fila.nombre}</td>
                <td>{fila.tamano}</td>
                <td>{fila.cantidad}</td>
                <td>{formatearMonto(fila.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ResumenTurnoPanel({ turnoId, onCerrar }: Props) {
  const toast = useToast()
  const [resumen, setResumen] = useState<ResumenTurno | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    turnosApi
      .resumen(turnoId, { signal: controller.signal })
      .then(setResumen)
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })

    return () => controller.abort()
  }, [turnoId])

  async function descargarPdf() {
    setDescargando(true)
    try {
      const pdf = await turnosApi.resumenPdf(turnoId)
      descargarBlob(pdf, `resumen-turno-${turnoId}.pdf`)
    } catch (e) {
      toast.error(e)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Resumen del turno #{turnoId}</h2>
        <div className={styles.actions}>
          <button className={styles.secondary} type="button" onClick={descargarPdf} disabled={descargando}>
            {descargando ? 'Generando…' : 'Descargar PDF'}
          </button>
          <button className={styles.secondary} type="button" onClick={onCerrar}>
            Cerrar resumen
          </button>
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!resumen && !error && <p className={styles.muted}>Cargando resumen…</p>}

      {resumen && (
        <>
          <p className={styles.muted}>
            {resumen.usuario} · {formatearFecha(resumen.apertura)} →{' '}
            {resumen.cierre ? formatearFecha(resumen.cierre) : 'abierto'}
          </p>

          <dl className={styles.stats}>
            <div>
              <dt>Pedidos</dt>
              <dd>{resumen.total_pedidos}</dd>
            </div>
            <div>
              <dt>Facturas</dt>
              <dd>{resumen.total_facturas}</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatearMonto(resumen.total_subtotal)}</dd>
            </div>
            <div>
              <dt>Impuesto</dt>
              <dd>{formatearMonto(resumen.total_impuesto)}</dd>
            </div>
            <div className={styles.statTotal}>
              <dt>Total vendido</dt>
              <dd>{formatearMonto(resumen.total_vendido)}</dd>
            </div>
            <div>
              <dt>Monto inicial</dt>
              <dd>{formatearMonto(resumen.monto_inicio)}</dd>
            </div>
            <div>
              <dt>Monto de cierre</dt>
              <dd>{formatearMonto(resumen.monto_cierre)}</dd>
            </div>
          </dl>

          <TablaVentas titulo="Pizzas" items={resumen.pizzas} />
          <TablaVentas titulo="Bebidas" items={resumen.bebidas} />
          <TablaVentas titulo="Otros" items={resumen.otros} />

          {resumen.combos.length > 0 && (
            <div>
              <h3>Combos</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Combo</th>
                      <th>Cant.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.combos.map((combo) => (
                      <tr key={combo.combo_id}>
                        <td>{combo.nombre}</td>
                        <td>{combo.cantidad}</td>
                        <td>{formatearMonto(combo.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resumen.inventario_bebidas.length > 0 && (
            <div>
              <h3>Inventario de bebidas</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Bebida</th>
                      <th>Vendidas</th>
                      <th>Stock actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.inventario_bebidas.map((bebida) => (
                      <tr key={bebida.producto_id}>
                        <td>{bebida.nombre}</td>
                        <td>{bebida.vendidas}</td>
                        <td>{bebida.stock_actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}