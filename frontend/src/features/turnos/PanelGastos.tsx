import { useCallback, useEffect, useState, type SubmitEvent } from 'react'
import { gastosApi } from '../../apis/gastos.ts'
import type { GastosDelTurno } from '../../apis/gastos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, formatearFecha, formatearMonto, mensajeDeError, parseMonto } from '../../utils/formato.ts'
import styles from '../catalogo/Catalogo.module.css'

interface Props {
  turnoId: number
  esAdmin: boolean
}

/** Efectivo que sale de la caja durante el turno: compras, pagos a proveedores, retiros. */
export function PanelGastos({ turnoId, esAdmin }: Props) {
  const toast = useToast()
  const [datos, setDatos] = useState<GastosDelTurno | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [categoria, setCategoria] = useState('')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    gastosApi
      .delTurno(turnoId, { signal: controller.signal })
      .then((d) => {
        setDatos(d)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
    return () => controller.abort()
  }, [turnoId, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  async function registrar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const valor = parseMonto(monto)
    if (categoria === '') return toast.error('Elige el tipo de gasto')
    if (valor === null || valor <= 0) return toast.error('Escribe cuántos Bs salieron de la caja')
    if (descripcion.trim() === '') return toast.error('Escribe en qué se gastó')
    setEnviando(true)
    try {
      await gastosApi.registrar(turnoId, { categoria, monto: valor, descripcion: descripcion.trim() })
      toast.exito(`Anotado: ${formatearMonto(valor)}`)
      setMonto('')
      setDescripcion('')
      recargar()
    } catch (e) {
      toast.error(e)
    } finally {
      setEnviando(false)
    }
  }

  async function anular(id: number) {
    if (!window.confirm('¿Anular este gasto? El dinero vuelve a contarse en la caja.')) return
    try {
      await gastosApi.anular(id)
      toast.exito('Gasto anulado')
    } catch (e) {
      toast.error(e)
    }
    recargar()
  }

  const disponible = datos ? Math.max(0, datos.tope_cajero - datos.resumen.total) : 0

  return (
    <div className={styles.page}>
      <p className={styles.muted}>
        Anota todo el efectivo que sacas de la caja (gas, insumos, pagos). Así el cuadre al cerrar
        no marca un faltante.
        {!esAdmin && datos && ` Puedes sacar hasta ${formatearMonto(datos.tope_cajero)} por turno; te quedan ${formatearMonto(disponible)}.`}
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <form className={styles.form} onSubmit={registrar} aria-label="Nuevo gasto">
        <label className={styles.field}>
          <span>Tipo</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Elegir…</option>
            {datos?.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Monto (Bs)</span>
          <input
            type="text"
            inputMode="decimal"
            value={monto}
            aria-label="Monto del gasto"
            onChange={(e) => setMonto(e.target.value)}
          />
        </label>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Detalle</span>
          <input
            type="text"
            value={descripcion}
            maxLength={200}
            placeholder="Garrafa de gas, cebolla, pago a Juan…"
            aria-label="Detalle del gasto"
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>
        <button className={styles.primary} type="submit" disabled={enviando}>
          {enviando ? 'Anotando…' : 'Anotar gasto'}
        </button>
      </form>

      {datos && datos.gastos.length === 0 && <p className={styles.muted}>Todavía no anotaste gastos en este turno.</p>}
      {datos && datos.gastos.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Detalle</th>
                <th>Quién</th>
                <th className={styles.num}>Monto</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {datos.gastos.map((g) => (
                <tr key={g.id} className={g.anulado ? styles.inactiva : undefined}>
                  <td>{formatearFecha(g.fecha)}</td>
                  <td>{g.categoria_nombre}</td>
                  <td>{g.descripcion}{g.anulado ? ` (anulado por ${g.anulado_por ?? '—'})` : ''}</td>
                  <td>{g.usuario ?? '—'}</td>
                  <td className={styles.num}>{formatearMonto(g.monto)}</td>
                  <td>
                    {!g.anulado && (
                      <button className={styles.link} type="button" onClick={() => anular(g.id)}>
                        anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {datos && datos.resumen.cantidad > 0 && (
        <p>
          Total salido de la caja: <strong>{formatearMonto(datos.resumen.total)}</strong>
        </p>
      )}
    </div>
  )
}
