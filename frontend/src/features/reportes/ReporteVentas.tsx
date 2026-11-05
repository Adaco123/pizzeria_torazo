import { Ban, Banknote, Bike, CalendarDays, ChartColumn, Percent, Receipt, ShoppingBag, Trophy, Users, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { reportesApi } from '../../apis/reportes.ts'
import type { ReporteVentas as Reporte } from '../../apis/reportes.ts'
import { esAbort, formatearFecha, formatearMonto, mensajeDeError } from '../../utils/formato.ts'
import { Cabeza, Vacio } from '../admin/ui.tsx'
import ui from '../admin/Ui.module.css'
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
        <Cabeza icono={CalendarDays} titulo="Periodo" />
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
            <button key={a.label} className={`${ui.btn} ${ui.secundario}`} type="button" onClick={() => elegir(a.dias)}>
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
            <dl className={ui.fichas}>
              <div className={ui.ficha}>
                <span className={ui.icono}>
                  <Banknote size={20} aria-hidden="true" />
                </span>
                <div>
                  <dt>Total vendido</dt>
                  <dd>{formatearMonto(reporte.total_vendido)}</dd>
                </div>
              </div>
              <div className={ui.ficha}>
                <span className={ui.icono}>
                  <Receipt size={20} aria-hidden="true" />
                </span>
                <div>
                  <dt>Pedidos</dt>
                  <dd>{reporte.pedidos}</dd>
                </div>
              </div>
              <div className={ui.ficha}>
                <span className={ui.icono}>
                  <ShoppingBag size={20} aria-hidden="true" />
                </span>
                <div>
                  <dt>Ticket promedio</dt>
                  <dd>{formatearMonto(reporte.ticket_promedio)}</dd>
                </div>
              </div>
              <div className={ui.ficha}>
                <span className={ui.icono}>
                  <Ban size={20} aria-hidden="true" />
                </span>
                <div>
                  <dt>Devuelto por cancelaciones</dt>
                  <dd>{formatearMonto(reporte.total_devuelto)}</dd>
                </div>
              </div>
              <div className={ui.ficha}>
                <span className={ui.icono}>
                  <Percent size={20} aria-hidden="true" />
                </span>
                <div>
                  <dt>Descuentos dados ({reporte.descuentos.pedidos})</dt>
                  <dd>{formatearMonto(reporte.descuentos.total)}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section className={styles.card}>
            <Cabeza icono={ChartColumn} titulo="Ventas por día" />
            <div className={ui.tw}>
              <table className={ui.tabla}>
                <thead>
                  <tr>
                    <th>Día</th>
                    <th className={ui.num}>Pedidos</th>
                    <th className={ui.num}>Total</th>
                    <th aria-label="Gráfico" />
                  </tr>
                </thead>
                <tbody>
                  {reporte.por_dia.map((d) => (
                    <tr key={d.fecha}>
                      <td>
                        <b>{etiquetaDia(d.fecha)}</b>
                      </td>
                      <td className={ui.num}>{d.pedidos}</td>
                      <td className={ui.num}>{formatearMonto(d.total)}</td>
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
            <Cabeza icono={Wallet} titulo="Por método de pago" />
            <p className={styles.muted}>Dinero neto: lo cobrado menos lo devuelto.</p>
            {reporte.por_metodo.length === 0 ? (
              <Vacio icono={Receipt} titulo="Sin cobros en este periodo." />
            ) : (
              <div className={ui.tw}>
                <table className={ui.tabla}>
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th className={ui.num}>Cobros</th>
                      <th className={ui.num}>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.por_metodo.map((m) => (
                      <tr key={m.metodo}>
                        <td>
                          <b>{m.metodo}</b>
                        </td>
                        <td className={ui.num}>{m.cantidad}</td>
                        <td className={ui.num}>{formatearMonto(m.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <Cabeza icono={Trophy} titulo="Lo más vendido" />
            <p className={styles.muted}>
              Ordenado por importe. En mitad y mitad cada sabor cuenta media pizza (½).
            </p>
            {reporte.por_producto.length === 0 ? (
              <Vacio icono={Receipt} titulo="Sin ventas en este periodo." />
            ) : (
              <div className={ui.tw}>
                <table className={ui.tabla}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className={ui.num}>Cantidad</th>
                      <th className={ui.num}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.por_producto.map((p, i) => (
                      <tr key={p.producto}>
                        <td>
                          <span className={`${ui.puesto} ${i < 3 ? ui.puestoTop : ''}`}>{i + 1}</span>
                          <b>{p.producto}</b>
                        </td>
                        <td className={ui.num}>{p.cantidad}</td>
                        <td className={ui.num}>{formatearMonto(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <Cabeza icono={Users} titulo="Mejores clientes" />
            <p className={styles.muted}>
              Ordenado por lo que gastaron en el periodo. Las ventas de mostrador (sin cliente) no cuentan.
            </p>
            {reporte.mejores_clientes.length === 0 ? (
              <Vacio icono={Receipt} titulo="Ningún cliente registrado compró en este periodo." />
            ) : (
              <div className={ui.tw}>
                <table className={ui.tabla}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Cliente</th>
                      <th>Teléfono</th>
                      <th className={ui.num}>Pedidos</th>
                      <th className={ui.num}>Gastó</th>
                      <th>Última compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.mejores_clientes.map((c, i) => (
                      <tr key={c.cliente_id}>
                        <td>
                          <span className={`${ui.puesto} ${i < 3 ? ui.puestoTop : ''}`}>{i + 1}</span>
                        </td>
                        <td>
                          <b>{c.cliente}</b>
                        </td>
                        <td>{c.telefono && c.telefono !== '0' ? c.telefono : '—'}</td>
                        <td className={ui.num}>{c.pedidos}</td>
                        <td className={ui.num}>{formatearMonto(c.total)}</td>
                        <td>{formatearFecha(c.ultima_compra)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <Cabeza icono={Bike} titulo="Envíos y repartidores" />
            <p className={styles.muted}>
              Envíos cobrados: <strong>{formatearMonto(reporte.envios.total)}</strong> en {reporte.envios.pedidos}{' '}
              {reporte.envios.pedidos === 1 ? 'pedido' : 'pedidos'}.
            </p>
            {reporte.por_repartidor.length === 0 ? (
              <Vacio icono={Receipt} titulo="No hubo domicilios en este periodo." />
            ) : (
              <div className={ui.tw}>
                <table className={ui.tabla}>
                  <thead>
                    <tr>
                      <th>Repartidor</th>
                      <th className={ui.num}>Entregas</th>
                      <th className={ui.num}>Envíos cobrados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.por_repartidor.map((r) => (
                      <tr key={r.repartidor}>
                        <td>
                          <b>{r.repartidor}</b>
                        </td>
                        <td className={ui.num}>{r.entregas}</td>
                        <td className={ui.num}>{formatearMonto(r.envios)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <Cabeza icono={Banknote} titulo="Gastos y retiros de caja" />
            {reporte.gastos.por_categoria.length === 0 ? (
              <Vacio icono={Receipt} titulo="No se anotaron gastos en este periodo." />
            ) : (
              <>
                <p className={styles.muted}>
                  Salió de la caja: <strong>{formatearMonto(reporte.gastos.total)}</strong>
                </p>
                <div className={ui.tw}>
                  <table className={ui.tabla}>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th className={ui.num}>Veces</th>
                        <th className={ui.num}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.gastos.por_categoria.map((c) => (
                        <tr key={c.categoria}>
                          <td>
                            <b>{c.nombre}</b>
                          </td>
                          <td className={ui.num}>{c.cantidad}</td>
                          <td className={ui.num}>{formatearMonto(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className={styles.card}>
            <Cabeza icono={Ban} titulo="Cancelaciones con devolución" />
            {reporte.cancelaciones.length === 0 ? (
              <Vacio icono={Receipt} titulo="No hubo cancelaciones en este periodo." />
            ) : (
              <div className={ui.tw}>
                <table className={ui.tabla}>
                  <thead>
                    <tr>
                      <th>Ficha</th>
                      <th>Fecha</th>
                      <th className={ui.num}>Devuelto</th>
                      <th>Motivo</th>
                      <th>Cajero</th>
                      <th>Canceló</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.cancelaciones.map((c) => (
                      <tr key={c.pedido_id}>
                        <td>
                          <b>{c.ficha ?? '—'}</b>
                        </td>
                        <td>{formatearFecha(c.fecha)}</td>
                        <td className={ui.num}>{formatearMonto(c.total_devuelto)}</td>
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
