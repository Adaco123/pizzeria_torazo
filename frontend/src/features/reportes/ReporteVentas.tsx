import { useEffect, useState } from 'react'
import { reportesApi } from '../../api.ts'
import type { ReporteVentas as Reporte } from '../../api.ts'
import { esAbort, formatearFecha, formatearMonto, mensajeDeError } from '../../utils/formato.ts'
import styles from '../catalogo/Catalogo.module.css'
import { diaDeBolivia, etiquetaDia } from './fechas.ts'

const ATAJOS = [
  { label: 'Hoy', dias: 0 },
  { label: 'Últimos 7 días', dias: 6 },
  { label: 'Últimos 30 días', dias: 29 },
] as const

export function ReporteVentas() {
  const [desde, setDesde] = useState(() => diaDeBolivia(6))
  const [hasta, setHasta] = useState(() => diaDeBolivia())
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (desde === '' || hasta === '' || desde > hasta) return
    const controller = new AbortController()
    reportesApi
      .ventas(desde, hasta, { signal: controller.signal })
      .then((datos) => {
        setReporte(datos)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })
    return () => controller.abort()
  }, [desde, hasta])

  function elegir(dias: number) {
    setCargando(true)
    setDesde(diaDeBolivia(dias))
    setHasta(diaDeBolivia())
  }

  const rangoMalo = desde !== '' && hasta !== '' && desde > hasta
  const maxDia = Math.max(1, ...(reporte?.por_dia.map((d) => d.total) ?? [0]))

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <h2>Periodo</h2>
        <div className={styles.rangoFechas}>
          <label className={styles.field}>
            <span>Desde</span>
            <input type="date" value={desde} max={hasta || undefined} onChange={(e) => { setCargando(true); setDesde(e.target.value) }} />
          </label>
          <label className={styles.field}>
            <span>Hasta</span>
            <input type="date" value={hasta} min={desde || undefined} onChange={(e) => { setCargando(true); setHasta(e.target.value) }} />
          </label>
          {ATAJOS.map((a) => (
            <button key={a.label} className={styles.secondary} type="button" onClick={() => elegir(a.dias)}>
              {a.label}
            </button>
          ))}
        </div>
        {rangoMalo && (
          <p className={styles.error} role="alert">
            «Desde» no puede ser posterior a «Hasta».
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>

      {cargando && !reporte && <p className={styles.muted}>Cargando reporte…</p>}

      {reporte && (
        <>
          <section className={styles.card}>
            <dl className={styles.stats}>
              <div>
                <dt>Total vendido</dt>
                <dd>{formatearMonto(reporte.total_vendido)}</dd>
              </div>
              <div>
                <dt>Pedidos</dt>
                <dd>{reporte.pedidos}</dd>
              </div>
              <div>
                <dt>Ticket promedio</dt>
                <dd>{formatearMonto(reporte.ticket_promedio)}</dd>
              </div>
              <div>
                <dt>Devuelto por cancelaciones</dt>
                <dd>{formatearMonto(reporte.total_devuelto)}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.card}>
            <h2>Ventas por día</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Día</th>
                    <th className={styles.num}>Pedidos</th>
                    <th className={styles.num}>Total</th>
                    <th aria-label="Gráfico" />
                  </tr>
                </thead>
                <tbody>
                  {reporte.por_dia.map((d) => (
                    <tr key={d.fecha}>
                      <td>{etiquetaDia(d.fecha)}</td>
                      <td className={styles.num}>{d.pedidos}</td>
                      <td className={styles.num}>{formatearMonto(d.total)}</td>
                      <td className={styles.celdaBarra}>
                        <span className={styles.barra} style={{ width: `${(d.total / maxDia) * 100}%` }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Por método de pago</h2>
            <p className={styles.muted}>Dinero neto: lo cobrado menos lo devuelto.</p>
            {reporte.por_metodo.length === 0 ? (
              <p className={styles.muted}>Sin cobros en este periodo.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th className={styles.num}>Cobros</th>
                      <th className={styles.num}>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.por_metodo.map((m) => (
                      <tr key={m.metodo}>
                        <td>{m.metodo}</td>
                        <td className={styles.num}>{m.cantidad}</td>
                        <td className={styles.num}>{formatearMonto(m.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Lo más vendido</h2>
            <p className={styles.muted}>
              Ordenado por importe. En mitad y mitad cada sabor cuenta media pizza (½).
            </p>
            {reporte.por_producto.length === 0 ? (
              <p className={styles.muted}>Sin ventas en este periodo.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className={styles.num}>Cantidad</th>
                      <th className={styles.num}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.por_producto.map((p) => (
                      <tr key={p.producto}>
                        <td>{p.producto}</td>
                        <td className={styles.num}>{p.cantidad}</td>
                        <td className={styles.num}>{formatearMonto(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Cancelaciones con devolución</h2>
            {reporte.cancelaciones.length === 0 ? (
              <p className={styles.muted}>No hubo cancelaciones en este periodo.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Ficha</th>
                      <th>Fecha</th>
                      <th className={styles.num}>Devuelto</th>
                      <th>Motivo</th>
                      <th>Cajero</th>
                      <th>Canceló</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.cancelaciones.map((c) => (
                      <tr key={c.pedido_id}>
                        <td>{c.ficha ?? '—'}</td>
                        <td>{formatearFecha(c.fecha)}</td>
                        <td className={styles.num}>{formatearMonto(c.total_devuelto)}</td>
                        <td>{c.motivo ?? '—'}</td>
                        <td>{c.cajero ?? '—'}</td>
                        <td>{c.cancelado_por ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
