import { ChevronLeft, ChevronRight, Minus, Search, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Ingrediente } from '../../../apis/ingredientes.ts'
import { formatearMonto } from '../../../utils/formato.ts'
import { crearBuscador, porNombre } from './buscar.ts'
import { abreviatura, cx } from './letras.ts'
import { Resaltado } from './Resaltado.tsx'
import styles from './Selector.module.css'

const POR_PAGINA = 12
const MAX_INSIGNIAS = 6

interface Props {
  /** "Hawaiana · Mediana" o "½ Hawaiana + ½ Margarita · Mediana". */
  titulo: string
  /** Texto antes de los extras elegidos: "Extras en ½ Hawaiana:". */
  prefijo?: string
  /** Las dos tarjetas de mitad y mitad, para cambiar de mitad sin salir del panel. */
  tarjetas?: ReactNode
  indiceTamano: number
  tamanos: number
  ingredientes: Ingrediente[]
  extras: Record<number, number>
  precioDe: (i: Ingrediente) => number
  total: number
  onSumar: (id: number) => void
  onQuitar: (id: number) => void
  onCerrar: () => void
}

/** Todos los ingredientes, de 12 en 12, con buscador. La mini pizza de arriba muestra lo que ya eligió. */
export function PanelMasExtras({
  titulo,
  prefijo,
  tarjetas,
  indiceTamano,
  tamanos,
  ingredientes,
  extras,
  precioDe,
  total,
  onSumar,
  onQuitar,
  onCerrar,
}: Props) {
  const [consulta, setConsulta] = useState('')
  const [pagina, setPagina] = useState(0)
  const buscador = crearBuscador(consulta)

  const lista = ingredientes.filter((i) => buscador.coincide(i.nombre)).toSorted(porNombre)
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const actual = Math.min(pagina, paginas - 1)
  const visibles = lista.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA)

  const elegidos = ingredientes.filter((i) => (extras[i.id] ?? 0) > 0)

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Más extras">
      <div className={cx(styles.hoja, styles.entra)}>
        <button type="button" className={styles.cerrar} aria-label="Volver" onClick={onCerrar}>
          <X size={20} aria-hidden="true" />
        </button>

        <header className={styles.mini}>
          <svg className={styles.miniDisco} viewBox="-20 -20 40 40" aria-hidden="true">
            {Array.from({ length: tamanos }, (_, z) => tamanos - 1 - z).map((z) => (
              <circle
                key={z}
                r={((tamanos === 1 ? 110 : 54 + (z * 111) / (tamanos - 1)) * 18) / 165}
                fill={z <= indiceTamano ? '#c8102e' : '#6d6266'}
                stroke="#fff"
                strokeWidth="1.2"
              />
            ))}
          </svg>
          <div className={styles.miniTexto}>
            <b>{titulo}</b>
            <span>
              {prefijo && <em>{prefijo}</em>}
              {elegidos.length === 0 && <em>toca un extra para sumarlo</em>}
              {elegidos.slice(0, MAX_INSIGNIAS).map((i) => (
                <i key={i.id} className={styles.insigniaMini}>
                  {abreviatura(i.nombre)}
                  {extras[i.id] > 1 ? ` ×${extras[i.id]}` : ''}
                </i>
              ))}
              {elegidos.length > MAX_INSIGNIAS && <i className={styles.insigniaMini}>+{elegidos.length - MAX_INSIGNIAS}</i>}
            </span>
          </div>
        </header>

        <div className={styles.panel}>
          <label className={styles.buscar}>
            <Search size={18} aria-hidden="true" />
            <input
              value={consulta}
              maxLength={40}
              autoComplete="off"
              placeholder="Buscar extra…"
              onChange={(e) => {
                setConsulta(e.target.value)
                setPagina(0)
              }}
            />
          </label>

          <div className={styles.cuadricula}>
            {visibles.map((i) => {
              const n = extras[i.id] ?? 0
              return (
                <div key={i.id} className={cx(styles.ec, n > 0 && styles.elegido)}>
                  <button type="button" className={styles.ea} onClick={() => onSumar(i.id)}>
                    <i className={styles.lt}>{abreviatura(i.nombre)}</i>
                    <span>
                      <b>
                        <Resaltado texto={i.nombre} buscador={buscador} />
                      </b>
                      <small>+{formatearMonto(precioDe(i))}</small>
                    </span>
                  </button>
                  {n > 0 && (
                    <>
                      <em className={styles.contador}>{n}</em>
                      <button type="button" className={styles.menos} onClick={() => onQuitar(i.id)} aria-label={`Quitar ${i.nombre}`}>
                        <Minus size={14} aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
            {visibles.length === 0 && <p className={styles.nada}>Nada coincide</p>}
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
          {tarjetas}
          <div className={styles.acciones}>
            <button type="button" className={styles.ir} onClick={onCerrar}>
              Listo · {formatearMonto(total)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
