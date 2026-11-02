import { AlertTriangle, Clock, Wallet } from 'lucide-react'
import { useEffect, useState, type SubmitEvent } from 'react'
import { gastosApi } from '../../../apis/gastos.ts'
import { turnosApi } from '../../../apis/turnos.ts'
import type { Turno } from '../../../apis/turnos.ts'
import { useToast } from '../../../toast/toast-context.ts'
import { formatearMonto, parseMonto } from '../../../utils/formato.ts'
import { minutosDesde, textoTiempo } from '../../cocina/tiempo.ts'
import { useAhora } from '../../cocina/useCocina.ts'
import { horaCorta } from './hora.ts'
import styles from './Herramientas.module.css'

interface Props {
  turno: Turno
  esAdmin: boolean
  /** Pedidos cobrados que todavía no se entregan (cocina o listos). */
  sinEntregar: number
  onCerrado: () => void
  onVerResumen: (turnoId: number) => void
}

/** Cierre «a ciegas»: el cajero cuenta el efectivo y recién después ve el cuadre. */
export function HojaCierre({ turno, esAdmin, sinEntregar, onCerrado, onVerResumen }: Props) {
  const toast = useToast()
  const ahora = useAhora()
  const [monto, setMonto] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [gastos, setGastos] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    gastosApi
      .delTurno(turno.id, { signal: controller.signal })
      .then((d) => setGastos(d.resumen.total))
      .catch(() => setGastos(null))
    return () => controller.abort()
  }, [turno.id])

  function revisar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (parseMonto(monto) === null) return toast.error('Escribe el efectivo que contaste en la caja (0 o mayor)')
    setConfirmando(true)
  }

  async function cerrar() {
    const valor = parseMonto(monto)
    if (valor === null) return
    setEnviando(true)
    try {
      await turnosApi.cerrar(turno.id, valor)
      toast.exito('Turno cerrado')
      onCerrado()
      onVerResumen(turno.id)
    } catch (e) {
      toast.error(e)
      setConfirmando(false)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={styles.cuerpo}>
      <div className={styles.resumenes}>
        <div className={styles.dato}>
          <small>
            <Clock size={13} aria-hidden="true" /> Turno #{turno.id}
          </small>
          <b>Desde {horaCorta(turno.apertura)}</b>
          <span>{textoTiempo(minutosDesde(turno.apertura, ahora)).replace('Hace', 'Abierto hace')}</span>
        </div>
        <div className={styles.dato}>
          <small>
            <Wallet size={13} aria-hidden="true" /> Con qué abriste
          </small>
          <b>{formatearMonto(turno.monto_inicio)}</b>
          <span>{gastos === null ? '' : `Gastos anotados: ${formatearMonto(gastos)}`}</span>
        </div>
      </div>

      {sinEntregar > 0 && (
        <p className={styles.aviso} role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          Hay {sinEntregar} {sinEntregar === 1 ? 'pedido' : 'pedidos'} sin entregar. Revísalos antes de cerrar.
        </p>
      )}

      <form className={styles.formulario} onSubmit={revisar} aria-label="Cerrar turno">
        <h3 className={styles.titulo}>Cuenta el efectivo de la caja</h3>
        <p className={styles.ayuda}>Cuenta todo el efectivo que hay, incluido el dinero con el que abriste. Después del cierre verás el cuadre.</p>
        <label className={styles.montoGrande}>
          <span>Bs</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={monto}
            aria-label="Efectivo contado en caja"
            onChange={(e) => {
              setMonto(e.target.value)
              setConfirmando(false)
            }}
            autoFocus
          />
        </label>

        {!confirmando ? (
          <button className={styles.principal} type="submit">
            Revisar y cerrar
          </button>
        ) : (
          <div className={styles.confirmacion}>
            <p>
              ¿Cerrar el turno con <b>{formatearMonto(parseMonto(monto) ?? 0)}</b> en caja? No podrás vender hasta abrir otro turno.
            </p>
            <div className={styles.fila}>
              <button type="button" className={styles.peligro} disabled={enviando} onClick={() => void cerrar()}>
                {enviando ? 'Cerrando…' : 'Sí, cerrar turno'}
              </button>
              <button type="button" className={styles.secundario} onClick={() => setConfirmando(false)}>
                Volver
              </button>
            </div>
          </div>
        )}
        {esAdmin && (
          <button type="button" className={styles.enlace} onClick={() => onVerResumen(turno.id)}>
            Ver el resumen sin cerrar
          </button>
        )}
      </form>
    </div>
  )
}
