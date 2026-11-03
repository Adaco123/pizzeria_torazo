import { Ban, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { categoriasApi } from '../../../apis/categorias.ts'
import type { Categoria } from '../../../apis/categorias.ts'
import { productosApi } from '../../../apis/productos.ts'
import type { Producto } from '../../../apis/productos.ts'
import { useToast } from '../../../toast/toast-context.ts'
import { esAbort, mensajeDeError } from '../../../utils/formato.ts'
import styles from './Herramientas.module.css'

const limpiar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

interface Props {
  /** Mesero: puede avisar que algo se acabó, pero no volver a habilitarlo (eso lo hace caja o cocina). */
  soloAvisar?: boolean
}

/** Marcar qué productos se acabaron: dejan de venderse en caja hasta que se vuelvan a habilitar. */
export function HojaAgotados({ soloAvisar = false }: Props) {
  const toast = useToast()
  const [productos, setProductos] = useState<Producto[] | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [soloAgotados, setSoloAgotados] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const opts = { signal: controller.signal }
    Promise.all([productosApi.listar(opts), categoriasApi.listar(opts)])
      .then(([lista, cats]) => {
        setProductos(lista.filter((p) => p.activo))
        setCategorias(cats)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
    return () => controller.abort()
  }, [])

  async function alternar(producto: Producto) {
    setOcupadoId(producto.id)
    try {
      const nuevo = await productosApi.marcarAgotado(producto.id, !producto.agotado)
      setProductos((lista) => lista?.map((p) => (p.id === nuevo.id ? { ...p, agotado: nuevo.agotado } : p)) ?? null)
      toast.exito(nuevo.agotado ? `${producto.nombre}: agotado` : `${producto.nombre}: disponible otra vez`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
    }
  }

  const agotados = productos?.filter((p) => p.agotado).length ?? 0
  const grupos = useMemo(() => {
    const q = limpiar(busqueda)
    const visibles = (productos ?? []).filter((p) => (!soloAgotados || p.agotado) && (q === '' || limpiar(p.nombre).includes(q)))
    return categorias
      .map((c) => ({ categoria: c, items: visibles.filter((p) => p.categoria_id === c.id) }))
      .filter((g) => g.items.length > 0)
  }, [productos, categorias, busqueda, soloAgotados])

  return (
    <div className={styles.cuerpo}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={styles.ayuda}>
        {soloAvisar
          ? 'Toca el producto que se acabó para avisar a caja y cocina. Ellos lo habilitan cuando haya de nuevo.'
          : 'Toca un producto para marcarlo como agotado. Vuelve a tocarlo para habilitarlo.'}
      </p>

      <div className={styles.filtros}>
        <label className={styles.buscar}>
          <Search size={16} aria-hidden="true" />
          <input type="search" value={busqueda} placeholder="Buscar producto…" aria-label="Buscar producto" onChange={(e) => setBusqueda(e.target.value)} />
        </label>
        <div className={styles.segmento} role="group" aria-label="Filtro">
          <button type="button" className={!soloAgotados ? styles.segOn : undefined} aria-pressed={!soloAgotados} onClick={() => setSoloAgotados(false)}>
            Todos
          </button>
          <button type="button" className={soloAgotados ? styles.segOn : undefined} aria-pressed={soloAgotados} onClick={() => setSoloAgotados(true)}>
            Agotados <i>{agotados}</i>
          </button>
        </div>
      </div>

      {!productos && !error && <p className={styles.vacio}>Cargando productos…</p>}
      {productos && grupos.length === 0 && (
        <p className={styles.vacio}>
          <Ban size={28} aria-hidden="true" />
          {soloAgotados ? 'No hay productos agotados' : 'Sin resultados'}
        </p>
      )}
      {grupos.map(({ categoria, items }) => (
        <section key={categoria.id} aria-label={categoria.nombre}>
          <h3 className={styles.titulo}>{categoria.nombre}</h3>
          <div className={styles.fichas}>
            {items.map((p) => (
              <button
                key={p.id}
                type="button"
                className={p.agotado ? `${styles.ficha} ${styles.fichaAgotada}` : styles.ficha}
                aria-pressed={p.agotado}
                disabled={ocupadoId === p.id || (soloAvisar && p.agotado)}
                onClick={() => void alternar(p)}
              >
                <span>{p.nombre}</span>
                {p.agotado && (
                  <small>
                    <Ban size={12} aria-hidden="true" /> Agotado
                  </small>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
