import { Banknote, Bike, GlassWater, Package, Boxes, Percent, Pizza, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ResumenTurno, VentaProducto } from '../../apis/turnos.ts'
import { formatearMonto } from '../../utils/formato.ts'
import { Cabeza } from '../admin/ui.tsx'
import ui from '../admin/Ui.module.css'
import styles from './Turnos.module.css'

function TablaVentas({ titulo, icono: Icono, items }: { titulo: string; icono: LucideIcon; items: VentaProducto[] }) {
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
    <div className={styles.seccion}>
      <h3>
        <span className={ui.etiqueta}>
          <Icono size={16} aria-hidden="true" /> {titulo}
        </span>
      </h3>
      <div className={ui.tw}>
        <table className={ui.tabla}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Tamaño</th>
              <th className={ui.num}>Cant.</th>
              <th className={ui.num}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.clave}>
                <td>
                  <b>{fila.nombre}</b>
                </td>
                <td>{fila.tamano}</td>
                <td className={ui.num}>{fila.cantidad}</td>
                <td className={ui.num}>{formatearMonto(fila.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Detalle completo del turno (solo administrador): gastos, envíos, ventas, combos e inventario. */
export function DetalleTurno({ resumen }: { resumen: ResumenTurno }) {
  const hayEnvios = resumen.envios.total > 0 || resumen.descuentos.total > 0

  return (
    <section className={styles.card}>
      <Cabeza icono={Wallet} titulo={`Detalle del turno #${resumen.turno_id}`} />

      {resumen.gastos.lista.length > 0 && (
        <div className={styles.seccion}>
          <h3>
            <span className={ui.etiqueta}>
              <Banknote size={16} aria-hidden="true" /> Gastos y retiros de caja
            </span>
          </h3>
          <div className={ui.tw}>
            <table className={ui.tabla}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th>Quién</th>
                  <th className={ui.num}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {resumen.gastos.lista.map((g) => (
                  <tr key={g.id} className={g.anulado ? ui.inactiva : undefined}>
                    <td>
                      <b>{g.categoria_nombre}</b>
                    </td>
                    <td>
                      {g.descripcion}
                      {g.anulado ? ' (anulado)' : ''}
                    </td>
                    <td>{g.usuario ?? '—'}</td>
                    <td className={ui.num}>{formatearMonto(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hayEnvios && (
        <div className={styles.seccion}>
          <h3>
            <span className={ui.etiqueta}>
              <Bike size={16} aria-hidden="true" /> Envíos y descuentos
            </span>
          </h3>
          <p className={styles.muted}>Ya están dentro del total vendido: los envíos suman, los descuentos restan.</p>
          <dl className={styles.fichasAncho}>
            <div className={styles.ficha}>
              <dt>Envíos cobrados ({resumen.envios.pedidos})</dt>
              <dd>{formatearMonto(resumen.envios.total)}</dd>
            </div>
            <div className={styles.ficha}>
              <dt>
                <Percent size={12} aria-hidden="true" /> Descuentos dados ({resumen.descuentos.pedidos})
              </dt>
              <dd>{formatearMonto(resumen.descuentos.total)}</dd>
            </div>
          </dl>
          {resumen.por_repartidor.length > 0 && (
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
                  {resumen.por_repartidor.map((r) => (
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
        </div>
      )}

      <TablaVentas titulo="Pizzas" icono={Pizza} items={resumen.pizzas} />
      <TablaVentas titulo="Bebidas" icono={GlassWater} items={resumen.bebidas} />
      <TablaVentas titulo="Otros" icono={Package} items={resumen.otros} />

      {resumen.combos.length > 0 && (
        <div className={styles.seccion}>
          <h3>
            <span className={ui.etiqueta}>
              <Package size={16} aria-hidden="true" /> Combos
            </span>
          </h3>
          <div className={ui.tw}>
            <table className={ui.tabla}>
              <thead>
                <tr>
                  <th>Combo</th>
                  <th className={ui.num}>Cant.</th>
                  <th className={ui.num}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {resumen.combos.map((combo) => (
                  <tr key={combo.combo_id}>
                    <td>
                      <b>{combo.nombre}</b>
                    </td>
                    <td className={ui.num}>{combo.cantidad}</td>
                    <td className={ui.num}>{formatearMonto(combo.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resumen.inventario_bebidas.length > 0 && (
        <div className={styles.seccion}>
          <h3>
            <span className={ui.etiqueta}>
              <Boxes size={16} aria-hidden="true" /> Inventario de bebidas
            </span>
          </h3>
          <div className={ui.tw}>
            <table className={ui.tabla}>
              <thead>
                <tr>
                  <th>Bebida</th>
                  <th className={ui.num}>Vendidas</th>
                  <th className={ui.num}>Stock actual</th>
                </tr>
              </thead>
              <tbody>
                {resumen.inventario_bebidas.map((bebida) => (
                  <tr key={bebida.producto_id}>
                    <td>
                      <b>{bebida.nombre}</b>
                    </td>
                    <td className={ui.num}>{bebida.vendidas}</td>
                    <td className={ui.num}>{bebida.stock_actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
