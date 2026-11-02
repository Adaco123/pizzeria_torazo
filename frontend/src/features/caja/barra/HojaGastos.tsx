import { Check, Receipt, X } from 'lucide-react'
import { useCallback, useEffect, useState, type SubmitEvent } from 'react'
import { gastosApi } from '../../../apis/gastos.ts'
import type { GastosDelTurno } from '../../../apis/gastos.ts'
import { useToast } from '../../../toast/toast-context.ts'
import { esAbort, formatearMonto, mensajeDeError, parseMonto } from '../../../utils/formato.ts'
import { horaCorta } from './hora.ts'
import styles from './Herramientas.module.css'

const MONTOS_RAPIDOS = [10, 20, 50, 100]

interface Props {
  turnoId: number
  esAdmin: boolean
}

/** Efectivo que sale de la caja durante el turno: compras, pagos, retiros. */
export function HojaGastos({ turnoId, esAdmin }: Props) {
  const toast = useToast()
  const [datos, setDatos] = useState<GastosDelTurno | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [categoria, setCategoria] = useState('')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [anulandoId, setAnulandoId] = useState<number | null>(null)

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
    setAnulandoId(null)
    try {
      await gastosApi.anular(id)
      toast.exito('Gasto anulado')
    } catch (e) {
      toast.error(e)
    }
    recargar()
  }

  const total = datos?.resumen.total ?? 0
  const tope = datos?.tope_cajero ?? 0
  const quedan = Math.max(0, tope - total)
  const usado = tope > 0 ? Math.min(100, (total / tope) * 100) : 0
  const conTope = !esAdmin && datos !== null && tope > 0

  return (
    <div className={styles.cuerpo}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.resumenes}>
        <div className={styles.dato}>
          <small>Salió de la caja</small>
          <b>{formatearMonto(total)}</b>
          <span>{datos?.resumen.cantidad ?? 0} {datos?.resumen.cantidad === 1 ? 'gasto' : 'gastos'}</span>
        </div>
        {conTope && (
          <div className={styles.dato}>
            <small>Te quedan para sacar</small>
            <b>{formatearMonto(quedan)}</b>
            <div className={styles.barraTope} role="progressbar" aria-valuenow={Math.round(usado)} aria-valuemin={0} aria-valuemax={100} aria-label="Tope usado">
              <i style={{ width: `${usado}%` }} data-alto={usado >= 80 || undefined} />
            </div>
            <span>de {formatearMonto(tope)} por turno</span>
          </div>
        )}
      </div>

      <form className={styles.formulario} onSubmit={registrar} aria-label="Nuevo gasto">
        <h3 className={styles.titulo}>Anotar un gasto</h3>
        <p className={styles.ayuda}>Todo el efectivo que sacas de la caja se anota aquí: así el cuadre no marca faltante.</p>

        <div className={styles.chips} role="group" aria-label="Tipo de gasto">
          {datos?.categorias.map((c) => (
            <button key={c.id} type="button" className={categoria === c.id ? `${styles.chip} ${styles.chipOn}` : styles.chip} aria-pressed={categoria === c.id} onClick={() => setCategoria(c.id)}>
              {c.nombre}
            </button>
          ))}
        </div>

        <label className={styles.montoGrande}>
          <span>Bs</span>
          <input type="text" inputMode="decimal" placeholder="0" value={monto} aria-label="Monto del gasto" onChange={(e) => setMonto(e.target.value)} />
        </label>
        <div className={styles.chips} aria-label="Montos rápidos">
          {MONTOS_RAPIDOS.map((m) => (
            <button key={m} type="button" className={styles.chipChico} onClick={() => setMonto(String(m))}>
              {m}
            </button>
          ))}
        </div>

        <input
          className={styles.texto}
          type="text"
          value={descripcion}
          maxLength={200}
          placeholder="¿En qué se gastó? Garrafa de gas, cebolla, pago a Juan…"
          aria-label="Detalle del gasto"
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <button className={styles.principal} type="submit" disabled={enviando}>
          {enviando ? 'Anotando…' : 'Anotar gasto'}
        </button>
      </form>

      <div>
        <h3 className={styles.titulo}>De este turno</h3>
        {datos && datos.gastos.length === 0 && (
          <p className={styles.vacio}>
            <Receipt size={28} aria-hidden="true" />
            Todavía no anotaste gastos
          </p>
        )}
        <ul className={styles.lista}>
          {datos?.gastos.map((g) => (
            <li key={g.id} className={g.anulado ? `${styles.item} ${styles.anulado}` : styles.item}>
              <span className={styles.hora}>{horaCorta(g.fecha)}</span>
              <span className={styles.itemTexto}>
                <b>{g.descripcion}</b>
                <small>
                  {g.categoria_nombre} · {g.usuario ?? '—'}
                  {g.anulado && ` · anulado por ${g.anulado_por ?? '—'}`}
                </small>
              </span>
              <b className={styles.importe}>{formatearMonto(g.monto)}</b>
              {!g.anulado &&
                (anulandoId === g.id ? (
                  <span className={styles.confirmar}>
                    <button type="button" className={styles.si} onClick={() => void anular(g.id)} aria-label="Confirmar anulación">
                      <Check size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.no} onClick={() => setAnulandoId(null)} aria-label="No anular">
                      <X size={16} aria-hidden="true" />
                    </button>
                  </span>
                ) : (
                  <button type="button" className={styles.enlace} onClick={() => setAnulandoId(g.id)}>
                    Anular
                  </button>
                ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
