import { Download, FileText, X } from 'lucide-react'
import { useState } from 'react'
import { turnosApi } from '../../apis/turnos.ts'
import type { ResumenTurno } from '../../apis/turnos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { descargarBlob } from '../../utils/archivos.ts'
import { formatearFecha, formatearMonto } from '../../utils/formato.ts'
import ui from '../admin/Ui.module.css'
import { CuadreCaja } from './CuadreCaja.tsx'
import styles from './Turnos.module.css'

interface Props {
  /** null = ningún turno elegido todavía. */
  turnoId: number | null
  resumen: ResumenTurno | null
  error: string | null
  onCerrar: () => void
}

/** «Ticket» del resumen: resumen y cuadre del turno elegido, con descarga en PDF. */
export function ResumenTicket({ turnoId, resumen, error, onCerrar }: Props) {
  const toast = useToast()
  const [descargando, setDescargando] = useState(false)

  if (turnoId === null) {
    return (
      <aside className={styles.ticket} aria-label="Resumen del turno">
        <div className={styles.cabeza}>
          <h2>Resumen</h2>
        </div>
        <div className={styles.vacioTicket}>
          <FileText size={36} aria-hidden="true" />
          <b>Elige un turno</b>
          <span>Toca uno de la lista para ver su cuadre.</span>
        </div>
      </aside>
    )
  }

  async function descargarPdf() {
    if (turnoId === null) return
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
    <aside className={styles.ticket} aria-label="Resumen del turno">
      <div className={styles.cabeza}>
        <h2>
          Turno <b>#{turnoId}</b>
        </h2>
        {resumen && (
          <span className={`${ui.estado} ${resumen.cierre ? ui.estadoOff : ui.estadoOn}`}>
            {resumen.cierre ? 'Cerrado' : 'Abierto'}
          </span>
        )}
      </div>

      <div className={styles.cuerpo}>
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

            <dl className={styles.fichas}>
              <div className={styles.ficha}>
                <dt>Pedidos</dt>
                <dd>{resumen.total_pedidos}</dd>
              </div>
              <div className={styles.ficha}>
                <dt>Facturas</dt>
                <dd>{resumen.total_facturas}</dd>
              </div>
              <div className={styles.ficha}>
                <dt>Subtotal</dt>
                <dd>{formatearMonto(resumen.total_subtotal)}</dd>
              </div>
              <div className={styles.ficha}>
                <dt>Impuesto</dt>
                <dd>{formatearMonto(resumen.total_impuesto)}</dd>
              </div>
              <div className={`${styles.ficha} ${styles.fichaTotal}`}>
                <dt>Total vendido</dt>
                <dd>{formatearMonto(resumen.total_vendido)}</dd>
              </div>
            </dl>

            <CuadreCaja resumen={resumen} />
          </>
        )}
      </div>

      <div className={styles.pie}>
        <button className={styles.grande} type="button" onClick={descargarPdf} disabled={descargando || !resumen}>
          <Download size={18} aria-hidden="true" /> {descargando ? 'Generando…' : 'Descargar PDF'}
        </button>
        <button className={`${ui.btn} ${ui.secundario} ${styles.ancho}`} type="button" onClick={onCerrar}>
          <X size={16} aria-hidden="true" /> Cerrar resumen
        </button>
      </div>
    </aside>
  )
}
