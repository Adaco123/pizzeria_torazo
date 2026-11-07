import { ArrowLeft, BellRing, Ban, Clock, HandCoins, Plus, Send, Trash2, User, UtensilsCrossed, X } from 'lucide-react'
import { useEffect, useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { mesasApi } from '../../apis/mesas.ts'
import { metodosPagoApi } from '../../apis/pagos.ts'
import { pedidosApi } from '../../apis/pedidos.ts'
import type { CuentaMesa } from '../../apis/mesas.ts'
import type { MetodoPago } from '../../apis/pagos.ts'
import type { Pedido, PagoCobro, TipoDescuento } from '../../apis/pedidos.ts'
import { useAuth } from '../../auth/auth-context.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearFecha, formatearMonto, parseMonto } from '../../utils/formato.ts'
import ui from '../admin/Ui.module.css'
import { Acciones, BotonIcono, Cabeza } from '../admin/ui.tsx'
import { MenuCaja } from '../caja/menu/MenuCaja.tsx'
import { PanelCobro } from '../caja/PanelCobro.tsx'
import { redondear } from '../cobro/facturacion.ts'
import { DetalleItems } from '../pedidos/DetalleItems.tsx'
import { EstadoBadge } from '../pedidos/EstadoBadge.tsx'
import { estadoDe } from '../pedidos/estados.ts'
import base from '../pedidos/Pedidos.module.css'
import { useCatalogo } from '../pedidos/useCatalogo.ts'
import styles from './Mesas.module.css'
import { useCuenta } from './useMesas.ts'

interface DescuentoForm {
  tipo: TipoDescuento
  valor: string
  motivo: string
}

const SIN_DESCUENTO: DescuentoForm = { tipo: 'porcentaje', valor: '', motivo: '' }

/** Productos de las rondas ya enviadas (sobre eso se calcula el descuento). */
function productosEnviados(rondas: Pedido[]): number {
  return redondear(
    rondas
      .filter((r) => estadoDe(r) !== 'pendiente')
      .reduce((suma, r) => suma + r.detalles.reduce((s, d) => s + d.subtotal, 0), 0),
  )
}

function descuentoEnBs(form: DescuentoForm, productos: number): number {
  const valor = parseMonto(form.valor)
  if (valor === null || valor <= 0) return 0
  return Math.min(productos, redondear(form.tipo === 'porcentaje' ? (productos * valor) / 100 : valor))
}

interface Props {
  cuentaId: number
  /** Dentro de otra pantalla (panel o ventana): sin enlace de volver y sin navegar al terminar. */
  embebido?: boolean
  /** Pantalla completa de /mesas/:id: tres columnas (cuenta · rondas · cobrar). Sin esto, todo va apilado. */
  enPagina?: boolean
  /** Se llama después de cada cambio en la cuenta, para que quien la muestra refresque. */
  onCambio?: () => void
  /** Se llama al cobrar o cerrar la cuenta. Sin esto se vuelve a /mesas. */
  onTerminar?: () => void
}

export function CuentaMesaView({ cuentaId, embebido = false, enPagina = false, onCambio, onTerminar }: Props) {
  const { sesion, hasRole } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const { cuenta, error, recargar } = useCuenta(cuentaId)
  const { catalogo } = useCatalogo()
  const [ocupado, setOcupado] = useState(false)
  const [cobrando, setCobrando] = useState(false)
  const [metodos, setMetodos] = useState<MetodoPago[]>([])
  const [form, setForm] = useState<DescuentoForm>(SIN_DESCUENTO)
  const [vista, setVista] = useState<'pedir' | 'cuenta'>('pedir')

  const puedeCobrar = hasRole('Cajero', 'Administrador')
  const esAdmin = hasRole('Administrador')

  useEffect(() => {
    if (!cobrando || metodos.length > 0) return
    metodosPagoApi.listar().then(setMetodos).catch((e: unknown) => toast.error(e))
  }, [cobrando, metodos.length, toast])

  const volver = embebido ? null : (
    <Link to="/mesas" className={styles.volverMesas}>
      <ArrowLeft size={16} aria-hidden="true" /> Mesas
    </Link>
  )
  const Encabezado = embebido ? 'h2' : 'h1'

  if (error && !cuenta) {
    return (
      <section className={base.page}>
        {volver}
        <p className={base.error} role="alert">
          {error}
        </p>
      </section>
    )
  }
  if (!cuenta) return <p className={base.muted}>Cargando mesa…</p>

  const abierta = cuenta.estado === 'abierta'
  const miBorrador = cuenta.rondas_detalle.find(
    (r) => estadoDe(r) === 'pendiente' && r.usuario_id === sesion?.id,
  )
  const ajenos = cuenta.rondas_detalle.filter((r) => estadoDe(r) === 'pendiente' && r !== miBorrador)
  const enviadas = cuenta.rondas_detalle.filter((r) => estadoDe(r) !== 'pendiente')
  const productos = productosEnviados(cuenta.rondas_detalle)
  const descuento = descuentoEnBs(form, productos)
  const totalACobrar = redondear(cuenta.total - descuento)

  async function accion(tarea: () => Promise<unknown>, exito?: string) {
    setOcupado(true)
    try {
      await tarea()
      if (exito) toast.exito(exito)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupado(false)
      recargar()
      onCambio?.()
    }
  }

  async function nuevaRonda() {
    await accion(() => mesasApi.nuevaRonda((cuenta as CuentaMesa).id))
  }

  async function enviar(ronda: Pedido) {
    if (ronda.detalles.length === 0) {
      toast.error('Agrega productos a la ronda antes de enviarla')
      return
    }
    await accion(() => mesasApi.enviarACocina(ronda.id), 'Ronda enviada a cocina')
  }

  async function descartar(ronda: Pedido) {
    if (!window.confirm('¿Descartar esta ronda sin enviar?')) return
    await accion(() => pedidosApi.eliminar(ronda.id), 'Ronda descartada')
  }

  async function entregar(ronda: Pedido) {
    await accion(() => pedidosApi.cambiarEstado(ronda.id, 'entregado'), 'Marcada como entregada')
  }

  async function cancelar(ronda: Pedido) {
    const escrito = window.prompt('Motivo de la cancelación (la ronda sale de la cuenta):')
    if (escrito === null) return
    if (escrito.trim().length < 3) {
      toast.error('Escribe el motivo de la cancelación')
      return
    }
    await accion(() => pedidosApi.cambiarEstado(ronda.id, 'cancelado', escrito.trim()), 'Ronda cancelada')
  }

  async function pedirCuenta() {
    const c = cuenta as CuentaMesa
    await accion(
      () => mesasApi.pedirCuenta(c.id, !c.pidio_cuenta),
      c.pidio_cuenta ? 'Se quitó el aviso de cuenta' : 'Marcada: pidió la cuenta',
    )
  }

  async function anular() {
    if (!window.confirm('¿Cerrar esta mesa sin cobrar? Solo si nadie consumió.')) return
    setOcupado(true)
    try {
      await mesasApi.anular((cuenta as CuentaMesa).id)
      toast.exito('Mesa cerrada sin consumo')
      if (onTerminar) onTerminar()
      else navegar('/mesas')
    } catch (e) {
      toast.error(e)
      setOcupado(false)
      recargar()
    }
  }

  function iniciarCobro(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.valor.trim() !== '') {
      const valor = parseMonto(form.valor)
      if (valor === null || valor <= 0) return toast.error('Escribe cuánto es el descuento')
      if (form.motivo.trim() === '') return toast.error('Escribe el motivo del descuento')
    }
    setCobrando(true)
  }

  async function confirmarCobro(pagos: PagoCobro[]) {
    const conDescuento = descuento > 0
    setOcupado(true)
    try {
      const { vuelto } = await mesasApi.cobrar(
        (cuenta as CuentaMesa).id,
        pagos,
        conDescuento
          ? { tipo: form.tipo, valor: parseMonto(form.valor) ?? 0, motivo: form.motivo.trim() }
          : undefined,
      )
      toast.exito(vuelto > 0 ? `Mesa cobrada. Vuelto ${formatearMonto(vuelto)}` : 'Mesa cobrada')
      if (onTerminar) onTerminar()
      else navegar('/mesas')
    } catch (e) {
      toast.error(e)
      setOcupado(false)
      recargar()
    }
  }

  const combos = catalogo?.combos ?? []

  if (!abierta) {
    return (
      <section className={base.page}>
        {volver}
        <Encabezado>Mesa {cuenta.mesa_numero}</Encabezado>
        <p className={base.muted}>
          Esta cuenta está {cuenta.estado === 'cobrada' ? 'cobrada' : 'cerrada sin consumo'}.
        </p>
      </section>
    )
  }

  if (cobrando) {
    return (
      <section className={base.page}>
        <Encabezado>Cobrar mesa {cuenta.mesa_numero}</Encabezado>
        <p className={base.muted}>
          Cuenta {formatearMonto(cuenta.total)}
          {descuento > 0 && ` − descuento ${formatearMonto(descuento)}`}
        </p>
        {metodos.length === 0 ? (
          <p className={base.muted}>Cargando métodos de pago…</p>
        ) : (
        <PanelCobro
          total={totalACobrar}
          metodos={metodos}
          ocupado={ocupado}
          tipo="Local"
          sinEspera
          textoVolver="Volver a la cuenta"
          onConfirmar={(pagos) => void confirmarCobro(pagos)}
          onVolver={() => setCobrando(false)}
        />
        )}
      </section>
    )
  }

  const turnoDeOtroDia = cuenta.turno_cerrado
  const contenedor = enPagina ? `${base.page} ${base.pageAncha}` : base.page
  const itemsBorrador = miBorrador ? miBorrador.detalles.reduce((s, d) => s + d.cantidad, 0) : 0

  const nuevaRondaRapida = !miBorrador ? (
    <button className={styles.tomarPedido} type="button" disabled={ocupado} onClick={() => void nuevaRonda()}>
      <Plus size={22} aria-hidden="true" /> Tomar pedido
    </button>
  ) : (
    <>
      {catalogo ? (
        <MenuCaja pedidoId={miBorrador.id} catalogo={catalogo} onAgregado={recargar} />
      ) : (
        <p className={base.muted}>Cargando el menú…</p>
      )}
      <section className={base.card}>
        <Cabeza icono={UtensilsCrossed} titulo="Tu pedido" cuenta={itemsBorrador} />
        <DetalleItems
          detalles={miBorrador.detalles}
          total={miBorrador.total}
          combos={combos}
          editable
          onQuitarExtra={(detalleId, extraId) =>
            void accion(() => pedidosApi.quitarExtra(miBorrador.id, detalleId, extraId))
          }
          onQuitarDetalle={(detalleId) => void accion(() => pedidosApi.quitarDetalle(miBorrador.id, detalleId))}
        />
      </section>
      <div className={styles.barraEnviar}>
        <BotonIcono
          icono={Trash2}
          titulo="Descartar el pedido"
          tono="peligro"
          disabled={ocupado}
          onClick={() => void descartar(miBorrador)}
        />
        <button
          className={styles.enviarGrande}
          type="button"
          disabled={ocupado || miBorrador.detalles.length === 0}
          onClick={() => void enviar(miBorrador)}
        >
          <Send size={18} aria-hidden="true" /> Enviar a cocina
          <span>
            {itemsBorrador} {itemsBorrador === 1 ? 'ítem' : 'ítems'} · {formatearMonto(miBorrador.total)}
          </span>
        </button>
      </div>
    </>
  )

  const encabezadoPagina = (
    <div className={styles.cuentaBarra}>
      {volver}
      <h1 className={styles.cuentaTitulo}>Mesa {cuenta.mesa_numero}</h1>
      <span className={styles.pildora}>Cuenta abierta</span>
      {cuenta.pidio_cuenta && <span className={`${styles.pildora} ${styles.pildoraAviso}`}>Pidió la cuenta</span>}
    </div>
  )

  const panelCuenta = (
    <aside className={styles.cuentaRiel} aria-label="Cuenta de la mesa">
      {enPagina ? <h2>Cuenta</h2> : <Encabezado style={{ margin: 0 }}>Mesa {cuenta.mesa_numero}</Encabezado>}
      <div className={styles.cuentaTotal}>
        <small>Total acumulado</small>
        <span className={styles.totalGrande}>{formatearMonto(cuenta.total)}</span>
        <div className={styles.cuentaMeta}>
          <span>
            <User size={13} aria-hidden="true" /> Abierta por {cuenta.abierta_por ?? '—'}
          </span>
          <span>
            <Clock size={13} aria-hidden="true" /> {formatearFecha(cuenta.abierta_en)} · {cuenta.rondas}{' '}
            {cuenta.rondas === 1 ? 'ronda' : 'rondas'}
          </span>
          {!enPagina && cuenta.pidio_cuenta && <span>Pidió la cuenta</span>}
        </div>
      </div>
      <button className={`${ui.btn} ${ui.secundario} ${styles.cuentaBoton}`} type="button" disabled={ocupado} onClick={() => void pedirCuenta()}>
        <BellRing size={16} aria-hidden="true" /> {cuenta.pidio_cuenta ? 'Quitar aviso de cuenta' : 'Pidió la cuenta'}
      </button>
      {cuenta.rondas === 0 && (
        <button
          className={`${ui.btn} ${ui.secundario} ${styles.cuentaBoton} ${styles.cuentaPeligro}`}
          type="button"
          disabled={ocupado}
          onClick={() => void anular()}
        >
          <X size={16} aria-hidden="true" /> Cerrar sin consumo
        </button>
      )}
    </aside>
  )

  const avisoTurno =
  turnoDeOtroDia && (
    <p className={base.aviso} role="status">
      Esta mesa quedó abierta de un turno anterior. Al cobrarla (o al pedir algo más) pasa a tu turno de hoy,
      así que necesitas tener un turno abierto.
    </p>
  )

  const avisoAjenos =
  ajenos.length > 0 && (
    <p className={base.aviso} role="status">
      Hay {ajenos.length} ronda(s) armadas por otra persona que todavía no se envían a cocina.
    </p>
  )

  const rondasEnviadas =
  enviadas.length > 0 && (
    <section className={base.card}>
      <Cabeza icono={UtensilsCrossed} titulo="Pedidos de la mesa" cuenta={enviadas.length} />
      {enviadas.map((ronda, i) => {
        const estado = estadoDe(ronda)
        const sePuedeCancelar =
          puedeCobrar && (estado === 'confirmado' || estado === 'en_preparacion' || (estado === 'listo' && esAdmin))
        return (
          <article key={ronda.id} className={estado === 'listo' ? `${styles.ronda} ${styles.rondaLista}` : styles.ronda}>
            <div className={styles.rondaCabecera}>
              <strong>
                Ronda {i + 1} · Ficha N° {ronda.numero_turno ?? '—'}
              </strong>
              <EstadoBadge estado={estado} />
              <span className={base.muted}>{formatearFecha(ronda.fecha)}</span>
              <span className={styles.rondaEspacio} />
              <Acciones>
                {estado === 'listo' && (
                  <BotonIcono icono={Send} titulo="Entregada en la mesa" tono="ok" disabled={ocupado} onClick={() => void entregar(ronda)} />
                )}
                {sePuedeCancelar && (
                  <BotonIcono icono={Ban} titulo="Cancelar ronda" tono="peligro" disabled={ocupado} onClick={() => void cancelar(ronda)} />
                )}
              </Acciones>
            </div>
            <DetalleItems
              detalles={ronda.detalles}
              total={ronda.total}
              combos={combos}
              editable={false}
              onQuitarExtra={() => {}}
            />
          </article>
        )
      })}
    </section>
  )

  const panelCobro =
  puedeCobrar && cuenta.rondas > 0 && (
    <aside className={styles.cuentaTicket} aria-label="Cobrar la cuenta">
      <div className={styles.cuentaTicketCabeza}>
        <h2>Cobrar</h2>
        <span className={styles.cuentaCantidad}>{formatearMonto(cuenta.total)}</span>
      </div>
      <form className={styles.cuentaTicketCuerpo} onSubmit={iniciarCobro}>
        <div className={base.field}>
          <span>Descuento (opcional)</span>
          <div className={base.chips}>
            {(['porcentaje', 'monto'] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                className={form.tipo === tipo ? base.chipActive : base.chip}
                aria-pressed={form.tipo === tipo}
                onClick={() => setForm({ ...form, tipo })}
              >
                {tipo === 'porcentaje' ? 'Porcentaje %' : 'Monto Bs'}
              </button>
            ))}
          </div>
        </div>
        <label className={base.field}>
          <span>Valor</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder={form.tipo === 'porcentaje' ? 'Ej. 10' : 'Ej. 15'}
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
          />
        </label>
        <label className={base.field}>
          <span>Motivo</span>
          <input
            maxLength={200}
            placeholder="Motivo del descuento"
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          />
        </label>
        {!esAdmin && (
          <small className={base.muted}>El cajero da hasta {cuenta.tope_descuento_cajero} % de descuento.</small>
        )}
        <button className={styles.cuentaCobrar} type="submit" disabled={ocupado}>
          <HandCoins size={18} aria-hidden="true" /> Cobrar {formatearMonto(totalACobrar)}
        </button>
      </form>
    </aside>
  )

  const seccionNuevaRonda = (
    <section className={base.card}>
      <Cabeza icono={Plus} titulo="Nueva ronda" />
      {!miBorrador ? (
        <div>
          <button className={`${ui.btn} ${ui.primario}`} type="button" disabled={ocupado} onClick={() => void nuevaRonda()}>
            <Plus size={16} aria-hidden="true" /> Tomar pedido
          </button>
        </div>
      ) : (
        <>
          <DetalleItems
            detalles={miBorrador.detalles}
            total={miBorrador.total}
            combos={combos}
            editable
            onQuitarExtra={(detalleId, extraId) =>
              void accion(() => pedidosApi.quitarExtra(miBorrador.id, detalleId, extraId))
            }
            onQuitarDetalle={(detalleId) => void accion(() => pedidosApi.quitarDetalle(miBorrador.id, detalleId))}
          />
          <div className={base.formRow}>
            <button
              className={`${ui.btn} ${ui.primario}`}
              type="button"
              disabled={ocupado || miBorrador.detalles.length === 0}
              onClick={() => void enviar(miBorrador)}
            >
              <Send size={16} aria-hidden="true" /> Enviar a cocina
            </button>
            <button className={`${ui.btn} ${ui.secundario}`} type="button" disabled={ocupado} onClick={() => void descartar(miBorrador)}>
              <Trash2 size={16} aria-hidden="true" /> Descartar
            </button>
          </div>
          {catalogo ? (
            <MenuCaja pedidoId={miBorrador.id} catalogo={catalogo} onAgregado={recargar} />
          ) : (
            <p className={base.muted}>Cargando el menú…</p>
          )}
        </>
      )}
    </section>
  )

  return (
    <section className={contenedor}>
      {enPagina ? encabezadoPagina : volver}

      {enPagina ? (
        <div className={styles.cuentaPagina}>
          {panelCuenta}
          <div className={styles.cuentaCentro}>
            {avisoTurno}
            {rondasEnviadas}
            {avisoAjenos}
            {seccionNuevaRonda}
          </div>
          {panelCobro}
        </div>
      ) : (
        <div className={styles.cuentaApilada}>
          <div className={styles.pestanasMesa} role="tablist" aria-label="Qué quieres hacer en la mesa">
            <button type="button" role="tab" aria-selected={vista === 'pedir'} onClick={() => setVista('pedir')}>
              <Plus size={16} aria-hidden="true" /> Pedir
              {itemsBorrador > 0 && <span className={styles.contador}>{itemsBorrador}</span>}
            </button>
            <button type="button" role="tab" aria-selected={vista === 'cuenta'} onClick={() => setVista('cuenta')}>
              <HandCoins size={16} aria-hidden="true" /> Cuenta
              {cuenta.rondas_listas > 0 && (
                <span className={`${styles.contador} ${styles.contadorListo}`}>{cuenta.rondas_listas} lista</span>
              )}
            </button>
          </div>
          {vista === 'pedir' ? (
            <>
              {avisoTurno}
              {avisoAjenos}
              {nuevaRondaRapida}
            </>
          ) : (
            <>
              {panelCuenta}
              {rondasEnviadas}
              {panelCobro}
            </>
          )}
        </div>
      )}
    </section>
  )
}
