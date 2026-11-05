import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ResumenTurno } from '../../apis/turnos.ts'
import { formatearMonto } from '../../utils/formato.ts'
import styles from './Turnos.module.css'

/** Efectivo que debería haber en caja contra el que se contó, y lo cobrado por cada método. */
export function CuadreCaja({ resumen }: { resumen: ResumenTurno }) {
  const metodos = Object.entries(resumen.pagos_por_metodo)
  const { diferencia } = resumen

  let veredicto = 'Falta contar el efectivo'
  let clase = styles.aviso
  let Icono = CircleAlert
  if (diferencia !== null) {
    if (Math.abs(diferencia) < 0.005) {
      veredicto = 'La caja cuadra'
      clase = styles.bien
      Icono = CircleCheck
    } else if (diferencia < 0) {
      veredicto = `Faltan ${formatearMonto(-diferencia)}`
      clase = styles.mal
    } else {
      veredicto = `Sobran ${formatearMonto(diferencia)}`
      clase = styles.mal
    }
  }

  return (
    <>
      <div className={styles.cuadre}>
        <h3>Cuadre de caja</h3>
        <div className={styles.linea}>
          <span>Monto inicial</span>
          <b>{formatearMonto(resumen.monto_inicio)}</b>
        </div>
        <div className={styles.linea}>
          <span>+ Efectivo cobrado</span>
          <b>{formatearMonto(resumen.efectivo_cobrado)}</b>
        </div>
        {resumen.gastos_caja > 0 && (
          <div className={styles.linea}>
            <span>− Gastos y retiros</span>
            <b>{formatearMonto(resumen.gastos_caja)}</b>
          </div>
        )}
        <div className={`${styles.linea} ${styles.lineaTotal}`}>
          <span>Efectivo esperado</span>
          <b>{formatearMonto(resumen.efectivo_esperado)}</b>
        </div>
        <div className={styles.linea}>
          <span>Efectivo contado</span>
          <b>{resumen.monto_cierre === null ? 'Pendiente' : formatearMonto(resumen.monto_cierre)}</b>
        </div>
      </div>

      <div className={`${styles.veredicto} ${clase}`}>
        <Icono size={20} aria-hidden="true" />
        {veredicto}
      </div>

      {metodos.length > 0 && (
        <div className={styles.cuadre}>
          <h3>Cobrado por método</h3>
          {metodos.map(([nombre, info]) => (
            <div key={nombre} className={styles.linea}>
              <span>
                {nombre} ({info.cantidad})
              </span>
              <b>{formatearMonto(info.total)}</b>
            </div>
          ))}
        </div>
      )}
      <p className={styles.muted}>
        Solo el efectivo pasa por la caja: lo cobrado con QR u otros métodos no se cuenta aquí. Las
        devoluciones por cancelaciones ya están descontadas.
      </p>
    </>
  )
}
