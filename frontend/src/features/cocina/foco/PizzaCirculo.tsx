import { Check } from 'lucide-react'
import { useState } from 'react'
import type { DetallePedido } from '../../../apis/pedidos.ts'
import { abreviatura } from '../../caja/menu/letras.ts'
import { escalaTamano, extrasDePizza, nombreDetalle, type ExtraVisible } from '../items.ts'
import styles from './Foco.module.css'

interface Props {
  detalle: DetallePedido
  /** Cuántas unidades de esta línea ya salieron del horno. */
  hecho: number
  /** Solo se puede marcar con el pedido en preparación. */
  interactivo: boolean
  onTocar: () => void
}

/** Radio del círculo según el tamaño: personal, mediana y familiar. */
const RADIOS = [52, 76, 100] as const

/** Puntitos de queso: fracción del radio y ángulo en grados. Fijos para que la pizza no cambie al refrescar. */
const PUNTOS: [number, number][] = [
  [0.55, 0], [0.8, 35], [0.55, 70], [0.8, 105], [0.55, 140], [0.8, 175],
  [0.55, 210], [0.8, 245], [0.55, 280], [0.8, 315], [0.3, 40], [0.3, 200],
]

/** Ángulos (grados) donde se ponen las burbujas de extras: pizza entera, mitad 1 (izquierda) y mitad 2 (derecha). */
const ANGULOS_ENTERA = [-55, -15, 25, 65, 105, 145, 185, 225]
const ANGULOS_MITAD: Record<1 | 2, number[]> = { 1: [165, 205, 125, 245], 2: [-15, 25, -55, 65] }

const aRadianes = (grados: number) => (grados * Math.PI) / 180
const textoExtra = (e: ExtraVisible) => `${e.nombre}${e.cantidad > 1 ? ` ×${e.cantidad}` : ''}`

/**
 * Una pizza del pedido como círculo: el tamaño se ve en el diámetro y los extras flotan alrededor.
 * En mitad y mitad cada mitad tiene su propio color (mitad 1 roja, mitad 2 oscura) y sus extras
 * quedan de su lado y con su color; además la leyenda de abajo los agrupa por mitad, así que el
 * cocinero nunca depende solo del color ni de pasar el mouse.
 */
export function PizzaCirculo({ detalle, hecho, interactivo, onTocar }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const escala = escalaTamano(detalle.tamano_nombre)
  const radio = RADIOS[escala]
  const mitades = [...detalle.mitades].sort((a, b) => a.mitad - b.mitad)
  const esMitad = detalle.is_mitad && mitades.length === 2
  const nombreMitad = (n: 1 | 2) => mitades.find((m) => m.mitad === n)?.producto?.nombre ?? '—'
  const extras = extrasDePizza(detalle)
  const enteros = extras.filter((e) => e.mitad === null)
  const completa = hecho >= detalle.cantidad
  const parcial = hecho > 0 && !completa
  const nombre = esMitad ? `½ ${nombreMitad(1)} + ½ ${nombreMitad(2)}` : nombreDetalle(detalle, {})

  const usados: Record<string, number> = {}
  const burbujas = extras.map((extra) => {
    const lado = extra.mitad === null ? 'entera' : String(extra.mitad)
    const n = (usados[lado] = (usados[lado] ?? -1) + 1)
    const lista = extra.mitad === null ? ANGULOS_ENTERA : ANGULOS_MITAD[extra.mitad]
    const angulo = aRadianes(lista[n % lista.length] ?? 0)
    return { extra, x: 50 + 45 * Math.cos(angulo), y: 50 + 45 * Math.sin(angulo) }
  })

  /** Color de la burbuja: el de su mitad. Un extra de pizza entera en una mitad y mitad va en gris. */
  const tono = (mitad: 1 | 2 | null) => (!esMitad ? '' : mitad === 1 ? styles.extraM1 : mitad === 2 ? styles.extraM2 : styles.extraEntera)

  return (
    <li className={styles.pizza}>
      <div className={styles.escenario}>
        <button
          type="button"
          className={styles.circulo}
          disabled={!interactivo}
          aria-pressed={interactivo ? completa : undefined}
          aria-label={`${nombre}${detalle.tamano_nombre ? `, ${detalle.tamano_nombre}` : ''}: ${hecho} de ${detalle.cantidad} listas`}
          onClick={onTocar}
        >
          <svg viewBox="-110 -110 220 220" aria-hidden="true">
            {RADIOS.filter((_, i) => i > escala).map((r) => (
              <circle key={r} r={r} className={styles.fantasma} />
            ))}
            {esMitad ? (
              <>
                <path d={`M 0 ${-radio} A ${radio} ${radio} 0 0 0 0 ${radio} Z`} className={styles.mitad1} />
                <path d={`M 0 ${-radio} A ${radio} ${radio} 0 0 1 0 ${radio} Z`} className={styles.mitad2} />
              </>
            ) : (
              <circle r={radio} className={styles.masa} />
            )}
            {PUNTOS.map(([f, grados]) => {
              const x = f * radio * Math.cos(aRadianes(grados))
              const y = f * radio * Math.sin(aRadianes(grados))
              const clase = !esMitad ? styles.punto : x < 0 ? styles.punto1 : styles.punto2
              return <circle key={`${f}-${grados}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={3.2} className={clase} />
            })}
            {esMitad && (
              <>
                <line x1="0" y1={-radio} x2="0" y2={radio} className={styles.corte} />
                {mitades.map((m) => (
                  <text
                    key={m.id}
                    x={m.mitad === 1 ? -radio * 0.5 : radio * 0.5}
                    y="0"
                    className={`${styles.inicial} ${m.mitad === 1 ? styles.inicial1 : styles.inicial2}`}
                  >
                    {abreviatura(m.producto?.nombre ?? '—')}
                  </text>
                ))}
              </>
            )}
          </svg>
          <span className={`${styles.hecho} ${completa ? styles.hechoSi : parcial ? styles.hechoParcial : ''}`}>
            {completa ? <Check size={44} strokeWidth={3} aria-hidden="true" /> : parcial ? `${hecho}/${detalle.cantidad}` : null}
          </span>
        </button>

        {burbujas.map(({ extra, x, y }) => (
          <button
            key={extra.id}
            type="button"
            className={`${styles.extra} ${tono(extra.mitad)} ${abierto === extra.id ? styles.extraAbierto : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-expanded={abierto === extra.id}
            aria-label={`${textoExtra(extra)}${extra.mitad !== null ? `, para la mitad de ${nombreMitad(extra.mitad)}` : ''}`}
            onClick={() => setAbierto(abierto === extra.id ? null : extra.id)}
          >
            {abreviatura(extra.nombre)}
            {extra.cantidad > 1 && <i>×{extra.cantidad}</i>}
            <span className={`${styles.etiquetaExtra} ${y < 35 ? styles.etiquetaAbajo : ''}`} role="tooltip">
              {textoExtra(extra)}
              {extra.mitad !== null && <small>½ {nombreMitad(extra.mitad)}</small>}
            </span>
          </button>
        ))}

        {detalle.cantidad > 1 && <span className={styles.cantidad}>×{detalle.cantidad}</span>}
      </div>

      <p className={styles.nombre}>
        {esMitad ? (
          <>
            <span className={styles.m1}>½ {nombreMitad(1)}</span> + <span className={styles.m2}>½ {nombreMitad(2)}</span>
          </>
        ) : (
          nombre
        )}
        {detalle.tamano_nombre && <span className={styles.talla}>{detalle.tamano_nombre}</span>}
      </p>

      {esMitad ? (
        <ul className={styles.leyendas}>
          {([1, 2] as const).map((n) => {
            const propios = extras.filter((e) => e.mitad === n)
            return (
              <li key={n}>
                <b className={n === 1 ? styles.m1 : styles.m2}>½ {nombreMitad(n)}</b>
                {propios.length > 0 ? `: ${propios.map((e) => `+ ${textoExtra(e)}`).join(' · ')}` : <span className={styles.sinExtras}> · sin extras</span>}
              </li>
            )
          })}
          {enteros.length > 0 && (
            <li>
              <b>Toda la pizza</b>: {enteros.map((e) => `+ ${textoExtra(e)}`).join(' · ')}
            </li>
          )}
        </ul>
      ) : (
        extras.length > 0 && <p className={styles.leyenda}>{extras.map((e) => `+ ${textoExtra(e)}`).join(' · ')}</p>
      )}
      {detalle.notas && <p className={styles.nota}>Nota: {detalle.notas}</p>}
    </li>
  )
}
