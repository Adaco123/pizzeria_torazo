import type { ResumenTurno } from '../../apis/turnos.ts'
import { formatearMonto } from '../../utils/formato.ts'
import styles from './Turnos.module.css'

/** Efectivo que debería haber en caja contra el que se contó, y lo cobrado por cada método. */
export function CuadreCaja({ resumen }: { resumen: ResumenTurno }) {
  const metodos = Object.entries(resumen.pagos_por_metodo)
  const { diferencia } = resumen

  let veredicto = 'Falta contar el efectivo'
  let clase = styles.statAviso
  if (diferencia !== null) {
    if (Math.abs(diferencia) < 0.005) {
      veredicto = 'La caja cuadra'
      clase = styles.statBien
    } else if (diferencia < 0) {
      veredicto = `Faltan ${formatearMonto(-diferencia)}`
      clase = styles.statMal
    } else {
      veredicto = `Sobran ${formatearMonto(diferencia)}`
      clase = styles.statMal
    }
  }

  return (
    <div>
      <h3>Cuadre de caja</h3>
      <dl className={styles.stats}>
        <div>
          <dt>Monto inicial</dt>
          <dd>{formatearMonto(resumen.monto_inicio)}</dd>
        </div>
        <div>
          <dt>+ Efectivo cobrado</dt>
          <dd>{formatearMonto(resumen.efectivo_cobrado)}</dd>
        </div>
        {resumen.gastos_caja > 0 && (
          <div>
            <dt>− Gastos y retiros</dt>
            <dd>{formatearMonto(resumen.gastos_caja)}</dd>
          </div>
        )}
        <div className={styles.statTotal}>
          <dt>Efectivo esperado</dt>
          <dd>{formatearMonto(resumen.efectivo_esperado)}</dd>
        </div>
        <div>
          <dt>Efectivo contado</dt>
          <dd>{resumen.monto_cierre === null ? 'Pendiente' : formatearMonto(resumen.monto_cierre)}</dd>
        </div>
        <div className={clase}>
          <dt>Diferencia</dt>
          <dd>{veredicto}</dd>
        </div>
      </dl>

      {metodos.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Método de pago</th>
                <th>Movimientos</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {metodos.map(([nombre, info]) => (
                <tr key={nombre}>
                  <td>{nombre}</td>
                  <td>{info.cantidad}</td>
                  <td>{formatearMonto(info.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.muted}>
        Solo el efectivo pasa por la caja: lo cobrado con QR u otros métodos no se cuenta aquí. Las
        devoluciones por cancelaciones ya están descontadas.
      </p>
    </div>
  )
}
