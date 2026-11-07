import { Circle, Minus, SplitSquareHorizontal, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { pedidosApi } from '../../../apis/pedidos.ts'
import type { DetalleMitadInput } from '../../../apis/pedidos.ts'
import type { Producto } from '../../../apis/productos.ts'
import { useToast } from '../../../toast/toast-context.ts'
import type { Catalogo } from '../../pedidos/useCatalogo.ts'
import { formatearMonto } from '../../../utils/formato.ts'
import { abreviatura, cx } from './letras.ts'
import { PanelMasExtras } from './PanelMasExtras.tsx'
import { PanelSegundaMitad } from './PanelSegundaMitad.tsx'
import { TarjetasMitad } from './TarjetasMitad.tsx'
import type { DatosPizza } from './useDatosPizzas.ts'
import { useSelectorPizza, type Extras, type Opcion } from './useSelectorPizza.ts'
import { registrarUso } from './usoLocal.ts'
import styles from './Selector.module.css'

const NOTAS_RAPIDAS = ['Sin cebolla', 'Bien cocida', 'Poco queso', 'Cortada en 12']
const CHIPS_SEGUNDA = 3

interface Props {
  pizza: Producto
  datos: DatosPizza | undefined
  datosDe: (productoId: number) => DatosPizza | undefined
  /** Pizzas que se pueden poner de segunda mitad. Vacío: este producto no admite mitad y mitad. */
  candidatas: Producto[]
  catalogo: Catalogo
  pedidoId: number
  onCerrar: () => void
  onAgregado: () => void
}

/** Cierra con Escape y evita que la página de atrás se mueva mientras el selector está abierto. */
function useBloqueoPantalla(onEscape: () => void) {
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', alTeclear)
    }
  }, [onEscape])
}

/** Envoltura: espera los precios de la pizza y recién entonces arma el selector. */
export function SelectorPizza(props: Props) {
  const { pizza, datos, onCerrar } = props
  useBloqueoPantalla(onCerrar)

  if (!datos || datos.fallo) {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={pizza.nombre}>
        <div className={styles.hoja}>
          <button type="button" className={styles.cerrar} aria-label="Cerrar" onClick={onCerrar}>
            <X size={20} aria-hidden="true" />
          </button>
          <p className={styles.aviso}>
            {datos ? 'No se pudieron leer los precios de esta pizza. Recarga la caja.' : 'Cargando precios…'}
          </p>
        </div>
      </div>
    )
  }

  const opciones: Opcion[] =
    datos.precios.length > 0
      ? datos.precios.map((p) => ({ tamanoId: p.tamano_id, nombre: p.tamano, precio: p.precio }))
      : [{ tamanoId: null, nombre: 'Precio base', precio: pizza.precio_base }]

  return <SelectorListo {...props} opciones={opciones} />
}

/** El nombre de cada mitad bajo la pizza; el de la mitad activa lleva una píldora blanca detrás. */
function NombreMitad({ x, texto, activa }: { x: number; texto: string; activa: boolean }) {
  const ref = useRef<SVGTextElement>(null)
  const [caja, setCaja] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    if (activa && ref.current) {
      const b = ref.current.getBBox()
      setCaja({ x: b.x, y: b.y, width: b.width, height: b.height })
    }
  }, [activa, texto])

  return (
    <>
      {activa && caja && (
        <rect
          className={styles.pildora}
          x={caja.x - 7}
          y={caja.y - 3}
          width={caja.width + 14}
          height={caja.height + 6}
          rx={(caja.height + 6) / 2}
        />
      )}
      <text ref={ref} className={cx(styles.hn, activa && styles.hnAct)} x={x} y="124">
        {texto}
      </text>
    </>
  )
}

function SelectorListo({
  pizza,
  datosDe,
  candidatas,
  catalogo,
  pedidoId,
  opciones,
  onCerrar,
  onAgregado,
}: Props & { opciones: Opcion[] }) {
  const toast = useToast()
  const s = useSelectorPizza({ pizza, opciones, catalogo, candidatas, datosDe })
  const { N, indice, tamano, hayMitad, segunda, lado, todos, rapidos } = s
  /** La otra pizza, solo cuando de verdad es mitad y mitad. */
  const otra = hayMitad ? segunda : null
  const [panel, setPanel] = useState<'extras' | 'segunda' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const dial = useRef<SVGSVGElement>(null)
  const hayMas = todos.length > rapidos.length

  const nombres: [string, string] = [pizza.nombre, segunda?.nombre ?? '']
  const titulo = otra ? `½ ${pizza.nombre} + ½ ${otra.nombre} · ${tamano.nombre}` : `${pizza.nombre} · ${tamano.nombre}`
  const abreviado = (n: string) => (n.length > 11 ? `${n.slice(0, 10)}…` : n)

  function alternarNota(frase: string) {
    s.setNota((actual) => {
      if (actual.includes(frase)) {
        return actual
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t !== '' && t !== frase)
          .join(', ')
      }
      return actual.trim() === '' ? frase : `${actual.trim().replace(/,$/, '')}, ${frase}`
    })
  }

  const aExtras = (e: Extras) =>
    Object.entries(e)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([id, cantidad]) => ({ ingrediente_id: Number(id), cantidad }))

  async function agregar() {
    if (s.problema) return toast.error(s.problema)
    setEnviando(true)
    let creado = false
    try {
      const notas = s.nota.trim() || null
      if (otra && tamano.tamanoId !== null) {
        const mitades: [DetalleMitadInput, DetalleMitadInput] = [
          { mitad: 1, producto_id: pizza.id, extras: aExtras(s.extras[0]) },
          { mitad: 2, producto_id: otra.id, extras: aExtras(s.extras[1]) },
        ]
        await pedidosApi.agregarDetalleMitad(pedidoId, { tamano_id: tamano.tamanoId, cantidad: 1, notas, mitades })
        creado = true
        registrarUso(pizza.id, aExtras(s.extras[0]).map((x) => x.ingrediente_id))
        registrarUso(otra.id, aExtras(s.extras[1]).map((x) => x.ingrediente_id))
      } else {
        const detalle = await pedidosApi.agregarDetalle(pedidoId, {
          producto_id: pizza.id,
          cantidad: 1,
          tamano_id: tamano.tamanoId,
          notas,
        })
        creado = true
        const elegidos = aExtras(s.extras[0])
        for (const extra of elegidos) await pedidosApi.agregarExtra(pedidoId, detalle.id, extra)
        registrarUso(pizza.id, elegidos.map((x) => x.ingrediente_id))
      }
      onCerrar()
    } catch (e) {
      toast.error(e)
      // Si la pizza ya quedó en el pedido, repetir el envío la duplicaría.
      if (creado) onCerrar()
      else setEnviando(false)
    } finally {
      onAgregado()
    }
  }

  // ---- Geometría del círculo: el anillo de cada tamaño ----
  const radio = (k: number) => (N === 1 ? 110 : 54 + (k * (165 - 54)) / (N - 1))
  const estadoAnillo = (z: number) => (z === indice ? styles.sel : z < indice ? styles.dentro : styles.fuera)

  function tocarAnillo(z: number, e: MouseEvent) {
    const r = dial.current?.getBoundingClientRect()
    s.elegirTamano(z, r && e.clientX < r.left + r.width / 2 ? 0 : 1)
  }

  // Letras de los extras elegidos, sobre la pizza (dentro del anillo del tamaño)
  const rE = indice === 0 ? 38 : radio(indice) - 18.5
  const paso = Math.max(12, (31 / rE) * 57.3)
  const ranuras = [0, 1, -1, 2, -2].map((k) => k * paso)
  const insignias = (h: 0 | 1, centro: number) => {
    const elegidos = Object.entries(s.extras[h]).filter(([, q]) => q > 0)
    return (
      <g key={h}>
        {elegidos.slice(0, 5).map(([id, q], j) => {
          const g = ((centro + ranuras[j]) * Math.PI) / 180
          const x = rE * Math.cos(g)
          const y = rE * Math.sin(g)
          return (
            <g key={id} className={styles.insignia}>
              <circle cx={x} cy={y} r="14" />
              <text x={x} y={y} className={styles.letra}>{abreviatura(s.nombreDe(Number(id)))}</text>
              {q > 1 && <text x={x + 13} y={y + 13} className={styles.cantidad}>×{q}</text>}
            </g>
          )
        })}
        {elegidos.length > 5 && (
          <text
            className={styles.cantidad}
            x={rE * Math.cos(((centro + 3 * paso) * Math.PI) / 180)}
            y={rE * Math.sin(((centro + 3 * paso) * Math.PI) / 180)}
          >
            +{elegidos.length - 5}
          </text>
        )}
      </g>
    )
  }

  // Posición de los botones de extras alrededor
  const ranurasAnillo = rapidos.length + (hayMas ? 1 : 0)
  const posicion = (i: number): CSSProperties => {
    const g = ((-90 + (i * 360) / ranurasAnillo) * Math.PI) / 180
    return { left: `${(50 + 42 * Math.cos(g)).toFixed(2)}%`, top: `${(50 + 42 * Math.sin(g)).toFixed(2)}%` }
  }
  const enMas = Object.entries(s.extras[lado])
    .filter(([id]) => !rapidos.some((r) => r.id === Number(id)))
    .reduce((sum, [, q]) => sum + q, 0)

  const etiqueta = (z: number) => {
    const nombre = opciones[z].nombre.toUpperCase()
    const precio = Math.round(opciones[z].precio)
    return z === 0 ? (
      <g key={z} className={cx(styles.lb, estadoAnillo(z))}>
        <text x="0" y="-12">{nombre}</text>
        <text x="0" y="14" className={styles.precioCentro}>{precio}</text>
      </g>
    ) : (
      <text key={z} className={cx(styles.lb, estadoAnillo(z))} x="0" y={-(radio(z) + radio(z - 1)) / 2}>
        {nombre} · {precio}
      </text>
    )
  }

  const tarjetas = hayMitad && (
    <TarjetasMitad
      nombres={nombres}
      extras={s.extras}
      ingredientes={todos}
      precioDe={s.precioDe}
      lado={lado}
      onLado={s.setLado}
    />
  )

  if (panel === 'segunda') {
    return (
      <PanelSegundaMitad
        primera={pizza.nombre}
        candidatas={candidatas}
        datosDe={datosDe}
        elegida={segunda?.id ?? null}
        onElegir={(id) => {
          s.elegirSegunda(id)
          setPanel(null)
        }}
        onCerrar={() => setPanel(null)}
      />
    )
  }

  if (panel === 'extras') {
    return (
      <PanelMasExtras
        titulo={titulo}
        prefijo={hayMitad ? `Extras en ½ ${nombres[lado]}:` : undefined}
        tarjetas={tarjetas}
        indiceTamano={indice}
        tamanos={opciones.length}
        ingredientes={todos}
        extras={s.extrasActivos}
        precioDe={s.precioDe}
        total={s.total}
        onSumar={s.sumar}
        onQuitar={s.quitar}
        onCerrar={() => setPanel(null)}
      />
    )
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={styles.hoja}>
        <button type="button" className={styles.cerrar} aria-label="Cerrar" onClick={onCerrar}>
          <X size={20} aria-hidden="true" />
        </button>

        <header className={styles.cabecera}>
          <h2>{titulo}</h2>
          <p>
            {hayMitad
              ? 'Toca una mitad para marcarla · los extras van a la mitad marcada y se cobran completos'
              : 'Toca un anillo para el tamaño · toca un círculo para sumar un extra'}
          </p>
        </header>

        <div className={styles.zona}>
          <div className={styles.escenario}>
            <svg
              ref={dial}
              className={styles.dial}
              viewBox="-170 -170 340 340"
              style={{ '--lf': N > 3 ? '13.5px' : '15px' } as CSSProperties}
              role="group"
              aria-label="Tamaño de la pizza"
            >
              {[...opciones.keys()].reverse().map((z) => (
                <circle
                  key={z}
                  className={cx(styles.rg, estadoAnillo(z))}
                  r={radio(z)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={z === indice}
                  aria-label={`${opciones[z].nombre}, Bs ${opciones[z].precio}`}
                  onClick={(e) => tocarAnillo(z, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      s.elegirTamano(z)
                    }
                  }}
                />
              ))}
              {hayMitad && <path className={styles.dim} d={`M0,-165A165,165 0 0 ${lado === 0 ? 1 : 0} 0,165Z`} />}
              {hayMitad ? (
                <>
                  {insignias(0, 180)}
                  {insignias(1, 0)}
                </>
              ) : (
                insignias(0, 90)
              )}
              {hayMitad && (
                <line x1="0" y1="-165" x2="0" y2="165" stroke="var(--color-on-primary)" strokeWidth="4" strokeDasharray="9 7" pointerEvents="none" />
              )}
              {hayMitad && <path className={styles.hring} d={`M0,-173A173,173 0 0 ${lado === 0 ? 0 : 1} 0,173`} />}
              {[...opciones.keys()].reverse().map(etiqueta)}
              {otra && (
                <>
                  <NombreMitad x={-56} texto={`½ ${abreviado(pizza.nombre).toUpperCase()}`} activa={lado === 0} />
                  <NombreMitad x={56} texto={`½ ${abreviado(otra.nombre).toUpperCase()}`} activa={lado === 1} />
                </>
              )}
            </svg>

            {rapidos.map((ing, i) => {
              const n = s.extrasActivos[ing.id] ?? 0
              return (
                <div key={ing.id} className={styles.xw} style={posicion(i)}>
                  <button
                    type="button"
                    className={cx(styles.xb, n > 0 && styles.on)}
                    onClick={() => s.sumar(ing.id)}
                    aria-label={`Agregar ${ing.nombre} extra, Bs ${s.precioDe(ing)}${hayMitad ? ` en ½ ${nombres[lado]}` : ''}`}
                  >
                    <i className={styles.lt}>{abreviatura(ing.nombre)}</i>
                    <b className={ing.nombre.length > 8 ? styles.largo : undefined}>{ing.nombre}</b>
                    <small>
                      +{s.precioDe(ing)}
                      {hayMitad ? ' ½' : ''}
                    </small>
                  </button>
                  {n > 0 && (
                    <>
                      <span className={styles.xn}>{n}</span>
                      <button type="button" className={styles.xmn} onClick={() => s.quitar(ing.id)} aria-label={`Quitar ${ing.nombre}`}>
                        <Minus size={14} aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
            {hayMas && (
              <div className={styles.xw} style={posicion(rapidos.length)}>
                <button
                  type="button"
                  className={cx(styles.xb, styles.mas)}
                  onClick={() => setPanel('extras')}
                  aria-label={`Más extras (${todos.length - rapidos.length})`}
                >
                  <i className={styles.lt}>＋</i>
                  <b>Más</b>
                  <small>+{todos.length - rapidos.length}</small>
                </button>
                {enMas > 0 && <span className={styles.xn}>{enMas}</span>}
              </div>
            )}
          </div>
        </div>

        <div className={styles.controles}>
          {s.puedeMitad && (
            <div className={styles.modo} role="group" aria-label="Tipo de pizza">
              <button type="button" aria-pressed={!s.mitad} onClick={() => s.mitad && s.alternarMitad()}>
                <Circle size={16} aria-hidden="true" /> Entera
              </button>
              <button type="button" aria-pressed={s.mitad} onClick={() => !s.mitad && s.alternarMitad()}>
                <SplitSquareHorizontal size={16} aria-hidden="true" /> Mitad y mitad
              </button>
            </div>
          )}
          {otra && (
            <div className={styles.bloque}>
              <span className={styles.etiqueta}>Segunda mitad</span>
              <div className={styles.sugeridas}>
                {[...new Set([otra.id, ...s.porUso.map((p) => p.id)])]
                  .slice(0, CHIPS_SEGUNDA)
                  .map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={otra.id === id ? styles.on : undefined}
                      onClick={() => s.elegirSegunda(id)}
                    >
                      {candidatas.find((c) => c.id === id)?.nombre}
                    </button>
                  ))}
                <button type="button" onClick={() => setPanel('segunda')}>
                  Otra…
                </button>
              </div>
              {tarjetas}
            </div>
          )}
          <div className={styles.bloque}>
            <label className={styles.etiqueta} htmlFor="nota-pizza">
              Nota para cocina
            </label>
            <input
              id="nota-pizza"
              className={styles.nota}
              value={s.nota}
              maxLength={120}
              autoComplete="off"
              placeholder="Opcional"
              onChange={(e) => s.setNota(e.target.value)}
            />
            <div className={styles.rapidas}>
              {NOTAS_RAPIDAS.map((frase) => (
                <button
                  key={frase}
                  type="button"
                  className={s.nota.includes(frase) ? styles.on : undefined}
                  onClick={() => alternarNota(frase)}
                >
                  {frase}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.acciones}>
            <button type="button" className={styles.fantasma} onClick={onCerrar}>
              Cancelar
            </button>
            <button type="button" className={styles.ir} disabled={enviando || s.problema !== null} onClick={agregar}>
              Agregar · {formatearMonto(s.total)}
            </button>
          </div>
          {s.problema && <p className={styles.problema}>{s.problema}</p>}
        </div>
      </div>
    </div>
  )
}
