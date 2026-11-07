import { GlassWater, Layers, PackageOpen, Pizza, Search, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { pedidosApi } from '../../../apis/pedidos.ts'
import type { Producto } from '../../../apis/productos.ts'
import { useToast } from '../../../toast/toast-context.ts'
import { esCategoriaBebidas, esCategoriaPizzas } from '../../pedidos/categorias.ts'
import type { Catalogo } from '../../pedidos/useCatalogo.ts'
import { crearBuscador, porNombre } from './buscar.ts'
import { SelectorPizza } from './SelectorPizza.tsx'
import { TarjetaPizza } from './TarjetaPizza.tsx'
import { TarjetaSimple } from './TarjetaSimple.tsx'
import { leerUso, ordenarPorUso } from './usoLocal.ts'
import { useDatosPizzas } from './useDatosPizzas.ts'
import pedidos from '../../pedidos/Pedidos.module.css'
import styles from './Menu.module.css'

const MAS_PEDIDAS = 8

interface Props {
  pedidoId: number
  catalogo: Catalogo
  onAgregado: () => void
}

type Pestana = 'pizzas' | 'combos' | 'bebidas' | 'otros'

const ETIQUETA: Record<Pestana, string> = { pizzas: 'Pizzas', combos: 'Combos', bebidas: 'Bebidas', otros: 'Otros' }
const ICONO: Record<Pestana, LucideIcon> = { pizzas: Pizza, combos: Layers, bebidas: GlassWater, otros: PackageOpen }

/** Una letra por tamaño ("P", "M", "F", "G"); si dos empiezan igual, se usan dos. */
function etiquetasDeTamanos(tamanos: Catalogo['tamanos']): Map<number, string> {
  const primeras = tamanos.map((t) => t.nombre.trim().charAt(0).toUpperCase())
  return new Map(
    tamanos.map((t, i) => {
      const repetida = primeras.filter((p) => p === primeras[i]).length > 1
      return [t.id, repetida ? t.nombre.trim().slice(0, 2) : primeras[i]]
    }),
  )
}

export function MenuCaja({ pedidoId, catalogo, onAgregado }: Props) {
  const toast = useToast()
  const [pestana, setPestana] = useState<Pestana>('pizzas')
  const [consulta, setConsulta] = useState('')
  const [elegida, setElegida] = useState<{ producto: Producto; esPizza: boolean } | null>(null)
  const [uso, setUso] = useState(leerUso)
  const [reciente, setReciente] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // ---- Qué se vende, separado por tipo ----
  const categorias = catalogo.categorias.filter((c) => c.activo)
  const categoriaPizzas = categorias.find(esCategoriaPizzas)
  const idsBebidas = new Set(categorias.filter(esCategoriaBebidas).map((c) => c.id))
  const activos = catalogo.productos.filter((p) => p.activo)
  const pizzas = activos.filter((p) => p.categoria_id === categoriaPizzas?.id)
  const bebidas = activos.filter((p) => idsBebidas.has(p.categoria_id))
  const otros = activos.filter(
    (p) => p.categoria_id !== categoriaPizzas?.id && !idsBebidas.has(p.categoria_id) && categorias.some((c) => c.id === p.categoria_id),
  )
  const combos = catalogo.combos.filter((c) => c.activo)

  // Las pizzas y los "otros" pueden tener precios por tamaño: se leen una vez y se guardan.
  const datos = useDatosPizzas([...pizzas, ...otros], catalogo.ingredientes)
  const etiquetas = etiquetasDeTamanos(catalogo.tamanos.toSorted((a, b) => a.id - b.id))
  const buscador = crearBuscador(consulta)

  const pestanas: Pestana[] = [
    ...(categoriaPizzas ? (['pizzas'] as const) : []),
    ...(combos.length > 0 ? (['combos'] as const) : []),
    ...(bebidas.length > 0 ? (['bebidas'] as const) : []),
    ...(otros.length > 0 ? (['otros'] as const) : []),
  ]
  const actual: Pestana | null = pestanas.includes(pestana) ? pestana : (pestanas[0] ?? null)
  const buscando = !buscador.vacio
  const ver = (p: Pestana) => buscando || actual === p

  // ---- Acciones ----
  async function agregarDirecto(clave: string, accion: () => Promise<unknown>) {
    if (ocupado) return
    setOcupado(true)
    try {
      await accion()
      setReciente(clave)
      window.setTimeout(() => setReciente((a) => (a === clave ? null : a)), 900)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupado(false)
      onAgregado()
    }
  }

  const agregarProducto = (p: Producto) =>
    agregarDirecto(`p${p.id}`, () =>
      pedidosApi.agregarDetalle(pedidoId, { producto_id: p.id, cantidad: 1, tamano_id: null, notas: null }),
    )

  function elegir(producto: Producto, esPizza: boolean) {
    if (producto.agotado) return toast.error(esPizza ? 'Esa pizza está agotada' : 'Ese producto está agotado')
    const d = datos[producto.id]
    if (!esPizza) {
      if (!d) return toast.error('Cargando precios…')
      // Un producto sin precios por tamaño se vende directo, a su precio base.
      if (!d.fallo && d.precios.length === 0) return void agregarProducto(producto)
    }
    setElegida({ producto, esPizza })
  }

  function alAgregar() {
    setUso(leerUso())
    onAgregado()
  }

  // ---- Piezas de pantalla ----
  const tarjetaConTamanos = (p: Producto, esPizza: boolean) => (
    <TarjetaPizza
      key={p.id}
      pizza={p}
      datos={datos[p.id]}
      etiquetas={etiquetas}
      buscador={buscador}
      onElegir={() => elegir(p, esPizza)}
    />
  )

  const coincideProducto = (p: Producto) =>
    buscador.coincide(p.nombre) ||
    buscador.coincide(datos[p.id]?.ingredientes.join(' ') ?? '') ||
    buscador.coincide(p.descripcion ?? '')

  const coincidenPizzas = pizzas.filter(coincideProducto).toSorted(porNombre)
  const populares = !buscando
    ? ordenarPorUso(
        pizzas.filter((p) => (uso.productos[p.id] ?? 0) > 0),
        uso.productos,
      ).slice(0, MAS_PEDIDAS)
    : []
  const idsPopulares = new Set(populares.map((p) => p.id))
  const restoPizzas = coincidenPizzas.filter((p) => !idsPopulares.has(p.id))

  const coincidenCombos = combos.filter((c) => buscador.coincide(c.nombre)).toSorted(porNombre)
  const coincidenBebidas = bebidas.filter((p) => buscador.coincide(p.nombre)).toSorted(porNombre)
  const coincidenOtros = otros.filter(coincideProducto).toSorted(porNombre)

  const hayResultados =
    (ver('pizzas') && coincidenPizzas.length > 0) ||
    (ver('combos') && coincidenCombos.length > 0) ||
    (ver('bebidas') && coincidenBebidas.length > 0) ||
    (ver('otros') && coincidenOtros.length > 0)

  const seccion = (titulo: string, hijos: React.ReactNode) => (
    <>
      {(buscando || titulo.startsWith('★') || titulo.startsWith('Todas')) && <h3 className={styles.seccion}>{titulo}</h3>}
      <div className={styles.rejilla}>{hijos}</div>
    </>
  )

  // Para el selector: pizzas que se pueden combinar (las demás, no agotadas).
  const candidatasDe = (p: Producto, esPizza: boolean) =>
    esPizza ? pizzas.filter((x) => x.id !== p.id && !x.agotado) : []

  return (
    <section className={styles.menu}>
      <div className={styles.cabecera}>
        {pestanas.length > 1 && (
          <div className={`${styles.vistas} ${styles.pestanas}`} role="group" aria-label="Qué vas a agregar">
            {pestanas.map((p) => {
              const Icono = ICONO[p]
              return (
                <button key={p} type="button" aria-pressed={!buscando && actual === p} onClick={() => setPestana(p)}>
                  <Icono size={16} aria-hidden="true" />
                  {ETIQUETA[p]}
                </button>
              )
            })}
          </div>
        )}

        <label className={styles.buscador}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar pizza, combo, bebida o ingrediente…"
            maxLength={40}
            autoComplete="off"
          />
          {consulta !== '' && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={(e) => {
                e.preventDefault()
                setConsulta('')
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      {pestanas.length === 0 && (
        <p className={pedidos.error} role="alert">
          No hay productos activos. Cárgalos en Catálogo.
        </p>
      )}

      {ver('pizzas') && categoriaPizzas && (
        <>
          {populares.length > 0 && seccion('★ Más pedidas', populares.map((p) => tarjetaConTamanos(p, true)))}
          {restoPizzas.length > 0 &&
            seccion(
              buscando
                ? `Pizzas (${restoPizzas.length})`
                : populares.length > 0
                  ? `Todas las demás · A–Z (${restoPizzas.length})`
                  : `Todas · A–Z (${restoPizzas.length})`,
              restoPizzas.map((p) => tarjetaConTamanos(p, true)),
            )}
        </>
      )}

      {ver('combos') &&
        coincidenCombos.length > 0 &&
        seccion(
          `Combos (${coincidenCombos.length})`,
          coincidenCombos.map((c) => (
            <TarjetaSimple
              key={`c${c.id}`}
              nombre={c.nombre}
              precio={c.precio}
              buscador={buscador}
              reciente={reciente === `c${c.id}`}
              onAgregar={() =>
                void agregarDirecto(`c${c.id}`, () =>
                  pedidosApi.agregarDetalle(pedidoId, { combo_id: c.id, cantidad: 1, notas: null }),
                )
              }
            />
          )),
        )}

      {ver('bebidas') &&
        coincidenBebidas.length > 0 &&
        seccion(
          `Bebidas (${coincidenBebidas.length})`,
          coincidenBebidas.map((p) => {
            const sinStock = p.stock === 0
            return (
              <TarjetaSimple
                key={`p${p.id}`}
                nombre={p.nombre}
                detalle={p.stock != null ? `Quedan ${p.stock}` : (p.descripcion ?? undefined)}
                precio={p.precio_base}
                agotado={p.agotado || sinStock}
                buscador={buscador}
                reciente={reciente === `p${p.id}`}
                onAgregar={() => {
                  if (p.agotado || sinStock) return toast.error('Ese producto está agotado')
                  void agregarProducto(p)
                }}
              />
            )
          }),
        )}

      {ver('otros') &&
        coincidenOtros.length > 0 &&
        seccion(`Otros (${coincidenOtros.length})`, coincidenOtros.map((p) => tarjetaConTamanos(p, false)))}

      {pestanas.length > 0 && buscando && !hayResultados && (
        <p className={styles.vacio}>Nada coincide con «{consulta.trim()}».</p>
      )}

      {elegida && (
        <SelectorPizza
          pizza={elegida.producto}
          datos={datos[elegida.producto.id]}
          datosDe={(id) => datos[id]}
          candidatas={candidatasDe(elegida.producto, elegida.esPizza)}
          catalogo={catalogo}
          pedidoId={pedidoId}
          onCerrar={() => setElegida(null)}
          onAgregado={alAgregar}
        />
      )}
    </section>
  )
}
