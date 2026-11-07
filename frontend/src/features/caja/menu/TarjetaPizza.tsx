import type { Producto } from '../../../apis/productos.ts'
import type { DatosPizza } from './useDatosPizzas.ts'
import type { Buscador } from './buscar.ts'
import { Resaltado } from './Resaltado.tsx'
import { cx } from './letras.ts'
import styles from './Menu.module.css'

interface Props {
  pizza: Producto
  datos: DatosPizza | undefined
  /** Etiqueta corta de cada tamaño por id ("P", "M", "F", "G"). */
  etiquetas: Map<number, string>
  buscador: Buscador
  onElegir: () => void
}

/** Tarjeta compacta: nombre y qué lleva a la izquierda, los precios por tamaño al costado. */
export function TarjetaPizza({ pizza, datos, etiquetas, buscador, onElegir }: Props) {
  const lleva = datos?.ingredientes.length ? datos.ingredientes.join(', ') : (pizza.descripcion ?? '')
  const precios = datos?.precios ?? []

  return (
    <button
      type="button"
      className={cx(styles.tarjeta, pizza.agotado && styles.agotada)}
      onClick={onElegir}
      aria-label={pizza.agotado ? `${pizza.nombre}, agotada` : pizza.nombre}
    >
      <span className={styles.texto}>
        <b>
          <Resaltado texto={pizza.nombre} buscador={buscador} />

        </b>
        {lleva && (
          <small>
            <Resaltado texto={lleva} buscador={buscador} />
          </small>
        )}
      </span>
      {pizza.agotado && <i className={styles.pildoraAgotada}>Agotada</i>}
      <span className={styles.precios}>
        {!datos && <i className={styles.cargandoPrecios}>…</i>}
        {datos?.fallo && <i className={styles.cargandoPrecios}>—</i>}
        {precios.map((p) => (
          <span key={p.tamano_id}>
            <em>{etiquetas.get(p.tamano_id) ?? p.tamano.charAt(0)}</em>
            {Math.round(p.precio)}
          </span>
        ))}
        {datos && !datos.fallo && precios.length === 0 && <span>{Math.round(pizza.precio_base)}</span>}
      </span>
    </button>
  )
}
