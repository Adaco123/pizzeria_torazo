
import { useEffect, useState, type SubmitEvent } from 'react'
import { pedidosApi, productosApi } from '../../api.ts'
import type { Ingrediente, IngredienteTamano, Producto, ProductoTamanoPrecio } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, formatearMonto, mensajeDeError } from '../../utils/formato.ts'
import type { Catalogo } from './useCatalogo.ts'
import { totalExtras } from './extras.ts'
import { ExtrasSelector } from './ExtrasSelector.tsx'
import styles from './Pedidos.module.css'

interface FormularioProps {
  pedidoId: number
  producto: Producto
  ingredientes: Ingrediente[]
  preciosExtra: IngredienteTamano[]
  onAgregado: () => void
  silencioso?: boolean
}

function FormularioProducto({
  pedidoId,
  producto,
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
  }, [producto.id, toast])

  const tamanoElegido = tamanos?.find((t) => t.tamano_id === tamanoId) ?? null
  // El backend NO calcula el precio por tamaño al agregar un producto: hay que enviarlo.
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
    if (tamanos && tamanos.length > 0 && !tamanoElegido) {
      toast.error('Elige un tamaño')
      return
    }

    setEnviando(true)
    try {
      const detalle = await pedidosApi.agregarDetalle(pedidoId, {
        producto_id: producto.id,
        cantidad: unidades,
        tamano_id: tamanoElegido?.tamano_id ?? null,
        precio_unitario: precio,
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

  if (tamanos === null) return <p className={styles.muted}>Cargando tamaños…</p>

  return (
    <form className={styles.formStack} onSubmit={agregar}>
      <h3>{producto.nombre}</h3>

      {tamanos.length === 0 && (
        <p className={styles.muted}>
          Este producto no tiene tamaños con precio cargados: se vende a {formatearMonto(producto.precio_base)}.
          Para ofrecer tamaños, cárgalos en Catálogo → producto → precios por tamaño.
        </p>
      )}
      {tamanos.length > 0 && (
        <div className={styles.field}>
          <span>Tamaño</span>
          <div className={styles.chips}>
            {tamanos.map((t) => (
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
      <ExtrasSelector
        ingredientes={ingredientes}
        valor={extras}
        onChange={setExtras}
        tamanoId={tamanoElegido?.tamano_id ?? null}
        precios={preciosExtra}
      />

      <div className={styles.formRow}>
        <button className={styles.primary} type="submit" disabled={enviando || !cantidadValida}>
          {enviando ? 'Agregando…' : 'Agregar al pedido'}
        </button>
        <span className={styles.muted}>
          {cantidadValida
            ? `${formatearMonto(precio * unidades + extrasTotal)}${extrasTotal > 0 ? ` (incluye extras ${formatearMonto(extrasTotal)})` : ''}`
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
  const producto = productos.find((p) => p.id === productoId) ?? null
  const ingredientes = catalogo.ingredientes.filter((i) => i.activo)

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
              className={p.id === productoId ? styles.productActive : styles.product}
              aria-pressed={p.id === productoId}
              onClick={() => setProductoId(p.id)}
            >
              {p.nombre}
              {p.precio_base > 0 && <small>{formatearMonto(p.precio_base)}</small>}
            </button>
          ))}
        </div>
      )}

      {producto && (
        <FormularioProducto
          key={producto.id}
          pedidoId={pedidoId}
          producto={producto}
          ingredientes={ingredientes}
          preciosExtra={catalogo.preciosExtra}
          onAgregado={onAgregado}
          silencioso={silencioso}
        />
      )}
    </div>
  )
}