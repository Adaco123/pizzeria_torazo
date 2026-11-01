import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useState } from 'react'
import type { Producto } from '../../../apis/productos.ts'
import { crearBuscador, porNombre } from './buscar.ts'
import { cx } from './letras.ts'
import { Resaltado } from './Resaltado.tsx'
import type { DatosPizza } from './useDatosPizzas.ts'
import styles from './Selector.module.css'

const POR_PAGINA = 12

interface Props {
  primera: string
  candidatas: Producto[]
  datosDe: (productoId: number) => DatosPizza | undefined
  elegida: number | null
  onElegir: (id: number) => void
  onCerrar: () => void
}

/** Todas las pizzas para elegir la otra mitad, con buscador por nombre o ingrediente. */
export function PanelSegundaMitad({ primera, candidatas, datosDe, elegida, onElegir, onCerrar }: Props) {
  const [consulta, setConsulta] = useState('')
  const [pagina, setPagina] = useState(0)
  const buscador = crearBuscador(consulta)

  const lista = candidatas
    .filter((p) => buscador.coincide(p.nombre) || buscador.coincide(datosDe(p.id)?.ingredientes.join(' ') ?? ''))
    .toSorted(porNombre)
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const actual = Math.min(pagina, paginas - 1)

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Segunda mitad">
      <div className={cx(styles.hoja, styles.entra)}>
        <button type="button" className={styles.cerrar} aria-label="Volver" onClick={onCerrar}>
          <X size={20} aria-hidden="true" />
        </button>

        <header className={styles.mini}>
          <div className={styles.miniTexto}>
            <b>Segunda mitad de ½ {primera}</b>
            <span>Elige la otra pizza</span>
          </div>
        </header>

        <div className={styles.panel}>
          <label className={styles.buscar}>
            <Search size={18} aria-hidden="true" />
            <input
              value={consulta}
              maxLength={40}
              autoComplete="off"
              placeholder="Buscar pizza o ingrediente…"
              onChange={(e) => {
                setConsulta(e.target.value)
                setPagina(0)
              }}
            />
          </label>

          <div className={styles.cuadricula}>
            {lista.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA).map((p) => (
              <div key={p.id} className={cx(styles.ec, elegida === p.id && styles.elegido)}>
                <button type="button" className={styles.ea} onClick={() => onElegir(p.id)}>
                  <span>
                    <b>
                      <Resaltado texto={p.nombre} buscador={buscador} />
                    </b>
                    <small>
                      <Resaltado texto={datosDe(p.id)?.ingredientes.join(', ') ?? ''} buscador={buscador} />
                    </small>
                  </span>
                </button>
              </div>
            ))}
            {lista.length === 0 && <p className={styles.nada}>Nada coincide</p>}
          </div>

          <div className={styles.pager}>
            <button type="button" disabled={actual <= 0} aria-label="Anterior" onClick={() => setPagina(actual - 1)}>
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <span>
              {actual + 1} / {paginas}
            </span>
            <button type="button" disabled={actual >= paginas - 1} aria-label="Siguiente" onClick={() => setPagina(actual + 1)}>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.controles}>
          <div className={styles.acciones}>
            <button type="button" className={styles.fantasma} onClick={onCerrar}>
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
