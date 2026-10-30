import { useEffect, useState, type SubmitEvent } from 'react'
import { pedidosApi } from '../../apis/pedidos.ts'
import { productosApi } from '../../apis/productos.ts'
import type { Ingrediente, IngredienteTamano } from '../../apis/ingredientes.ts'
import type { Producto, ProductoTamanoPrecio } from '../../apis/productos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, formatearMonto, mensajeDeError } from '../../utils/formato.ts'
import type { Catalogo } from './useCatalogo.ts'
import { esCategoriaBebidas } from './categorias.ts'
import { totalExtras } from './extras.ts'
import { ExtrasSelector } from './ExtrasSelector.tsx'
import styles from './Pedidos.module.css'

interface FormularioProps {
  pedidoId: number
  producto: Producto
  /** Bebida: se vende por unidad con stock, sin tamaños ni extras. */
  esBebida: boolean
  ingredientes: Ingrediente[]
  preciosExtra: IngredienteTamano[]
  onAgregado: () => void
  silencioso?: boolean
}

function FormularioProducto({
  pedidoId,
  producto,
  esBebida,
  ingredientes,
  preciosExtra,
  onAgregado,
  silencioso = false,
}: FormularioProps) {
  const toast = useToast()
  // null = todavía cargando los tamaños del producto
  const [tamanos, setTamanos] = useState<ProductoTamanoPrecio[] | null>(null)
  const [tamanoId, setTamanoId] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState('1')
  const [notas, setNotas] = useState('')
  const [extras, setExtras] = useState<Record<number, number>>({})
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (esBebida) return
    const controller = new AbortController()

    productosApi
      .tamanos(producto.id, { signal: controller.signal })
      .then((lista) => {
        setTamanos(lista)
        setTamanoId(lista[0]?.tamano_id ?? null)
      })
      .catch((e: unknown) => {
        if (esAbort(e)) return
        setTamanos([])
        toast.error(`No se pudieron cargar los tamaños: ${mensajeDeError(e)}`)
      })

    return () => controller.abort()
  }, [producto.id, esBebida, toast])

  // Una bebida no espera tamaños: no hay nada que cargar.
  const tamanosVisibles = esBebida ? [] : tamanos
  const tamanoElegido = tamanosVisibles?.find((t) => t.tamano_id === tamanoId) ?? null
  // Solo es la vista previa: el precio real lo decide el servidor según el tamaño.
  const precio = tamanoElegido ? tamanoElegido.precio : producto.precio_base
  const unidades = Number.parseInt(cantidad, 10)
  const extrasTotal = totalExtras(extras, ingredientes, tamanoElegido?.tamano_id ?? null, preciosExtra)
  const cantidadValida = Number.isInteger(unidades) && unidades >= 1

  async function agregar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cantidadValida) {
      toast.error('La cantidad debe ser 1 o más')
      return
    }
    if (tamanosVisibles && tamanosVisibles.length > 0 && !tamanoElegido) {
      toast.error('Elige un tamaño')
      return
    }

    setEnviando(true)
    try {
      const detalle = await pedidosApi.agregarDetalle(pedidoId, {
        producto_id: producto.id,
        cantidad: unidades,
        tamano_id: tamanoElegido?.tamano_id ?? null,
        notas: notas.trim() || null,
      })
      for (const [ingredienteId, cantidadExtra] of Object.entries(extras)) {
        await pedidosApi.agregarExtra(pedidoId, detalle.id, {
          ingrediente_id: Number(ingredienteId),
          cantidad: cantidadExtra,
        })
      }
      if (!silencioso) toast.exito(`${producto.nombre} agregado`)
      setCantidad('1')
      setNotas('')
      setExtras({})
    } catch (e) {
      toast.error(e)
    } finally {
      setEnviando(false)
      // Se recarga siempre: si falló un extra, el producto ya quedó agregado.
      onAgregado()
    }
  }

  if (tamanosVisibles === null) return <p className={styles.muted}>Cargando tamaños…</p>

  return (
    <form className={styles.formStack} onSubmit={agregar}>
      <h3>{producto.nombre}</h3>

      {esBebida && (
        <p className={styles.muted}>
          Quedan {producto.stock ?? 0} unidades. Si llegó mercadería, agrégala en «Stock de bebidas».
        </p>
      )}
      {!esBebida && tamanosVisibles.length === 0 && (
        <p className={styles.muted}>
          Este producto no tiene tamaños con precio cargados: se vende a {formatearMonto(producto.precio_base)}.
          Para ofrecer tamaños, cárgalos en Catálogo → producto → precios por tamaño.
        </p>
      )}
      {tamanosVisibles.length > 0 && (
        <div className={styles.field}>
          <span>Tamaño</span>
          <div className={styles.chips}>
            {tamanosVisibles.map((t) => (
              <button
                key={t.tamano_id}
                type="button"
                className={t.tamano_id === tamanoId ? styles.chipActive : styles.chip}
                aria-pressed={t.tamano_id === tamanoId}
                onClick={() => setTamanoId(t.tamano_id)}
              >
                {t.tamano} · {formatearMonto(t.precio)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.formRow}>
        <label className={styles.field}>
          <span>Cantidad</span>
          <input
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Notas (opcional)</span>
          <input
            type="text"
            value={notas}
            placeholder="Sin cebolla, bien cocida…"
            onChange={(e) => setNotas(e.target.value)}
          />
        </label>
      </div>

      {/* Los extras no dependen del tamaño: sin tamaño se cobra el precio extra base del ingrediente. */}
      {!esBebida && (
        <ExtrasSelector
          ingredientes={ingredientes}
          valor={extras}
          onChange={setExtras}
          tamanoId={tamanoElegido?.tamano_id ?? null}
          precios={preciosExtra}
        />
      )}

      <div className={styles.formRow}>
        <button className={styles.primary} type="submit" disabled={enviando || !cantidadValida}>
          {enviando ? 'Agregando…' : 'Agregar al pedido'}
        </button>
        <span className={styles.muted}>
          {cantidadValida
            ? `${formatearMonto((precio + extrasTotal) * unidades)}${extrasTotal > 0 ? ` (extras ${formatearMonto(extrasTotal)} por unidad)` : ''}`
            : ''}
        </span>
      </div>
    </form>
  )
}

interface Props {
  pedidoId: number
  catalogo: Catalogo
  onAgregado: () => void
  /** Sin aviso de éxito: la caja ya muestra la línea nueva en el ticket. */
  silencioso?: boolean
}

export function AgregarProducto({ pedidoId, catalogo, onAgregado, silencioso = false }: Props) {
  const categorias = catalogo.categorias.filter((c) => c.activo)
  const [categoriaId, setCategoriaId] = useState<number | null>(categorias[0]?.id ?? null)
  const [productoId, setProductoId] = useState<number | null>(null)

  const productos = catalogo.productos.filter((p) => p.activo && p.categoria_id === categoriaId)
  // Si se agota mientras estaba elegido, deja de ofrecerse el formulario.
  const producto = productos.find((p) => p.id === productoId && !p.agotado) ?? null
  const ingredientes = catalogo.ingredientes.filter((i) => i.activo)
  const categoriaElegida = categorias.find((c) => c.id === categoriaId)
  const esBebida = categoriaElegida !== undefined && esCategoriaBebidas(categoriaElegida)

  if (categorias.length === 0) return <p className={styles.muted}>No hay categorías activas.</p>

  return (
    <div className={styles.formStack}>
      <div className={styles.chips}>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className={categoria.id === categoriaId ? styles.chipActive : styles.chip}
            aria-pressed={categoria.id === categoriaId}
            onClick={() => {
              setCategoriaId(categoria.id)
              setProductoId(null)
            }}
          >
            {categoria.nombre}
          </button>
        ))}
      </div>

      {productos.length === 0 ? (
        <p className={styles.muted}>No hay productos activos en esta categoría.</p>
      ) : (
        <div className={styles.productGrid}>
          {productos.map((p) => (
            <button
              key={p.id}
              type="button"
              className={
                p.agotado ? styles.productAgotado : p.id === productoId ? styles.productActive : styles.product
              }
              aria-pressed={p.id === productoId}
              disabled={p.agotado}
              onClick={() => setProductoId(p.id)}
            >
              {p.nombre}
              {p.agotado ? <small>Agotado</small> : p.precio_base > 0 && <small>{formatearMonto(p.precio_base)}</small>}
            </button>
          ))}
        </div>
      )}

      {producto && (
        <FormularioProducto
          key={producto.id}
          pedidoId={pedidoId}
          producto={producto}
          esBebida={esBebida}
          ingredientes={ingredientes}
          preciosExtra={catalogo.preciosExtra}
          onAgregado={onAgregado}
          silencioso={silencioso}
        />
      )}
    </div>
  )
}