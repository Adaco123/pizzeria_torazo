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
import { PanelCobro } from '../caja/PanelCobro.tsx'
import cajaStyles from '../caja/Caja.module.css'
import { redondear } from '../cobro/facturacion.ts'
import { AgregarItemPanel } from '../pedidos/AgregarItemPanel.tsx'
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
}

export function CuentaMesaView({ cuentaId }: Props) {
  const { sesion, hasRole } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const { cuenta, error, recargar } = useCuenta(cuentaId)
  const { catalogo } = useCatalogo()
  const [ocupado, setOcupado] = useState(false)
  const [cobrando, setCobrando] = useState(false)
  const [metodos, setMetodos] = useState<MetodoPago[]>([])
  const [form, setForm] = useState<DescuentoForm>(SIN_DESCUENTO)

  const puedeCobrar = hasRole('Cajero', 'Administrador')
  const esAdmin = hasRole('Administrador')

  useEffect(() => {
    if (!cobrando || metodos.length > 0) return
    metodosPagoApi.listar().then(setMetodos).catch((e: unknown) => toast.error(e))
  }, [cobrando, metodos.length, toast])

  const volver = (
    <Link to="/mesas" className={base.back}>
      ← Volver a las mesas
    </Link>
  )

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
      navegar('/mesas')
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
      navegar('/mesas')
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
        <h1>Mesa {cuenta.mesa_numero}</h1>
        <p className={base.muted}>
          Esta cuenta está {cuenta.estado === 'cobrada' ? 'cobrada' : 'cerrada sin consumo'}.
        </p>
      </section>
    )
  }

  if (cobrando) {
    return (
      <section className={base.page}>
        <h1>Cobrar mesa {cuenta.mesa_numero}</h1>
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

  return (
    <section className={base.page}>
      {volver}

      <section className={base.card}>
        <div className={styles.resumen}>
          <div>
            <h1 style={{ margin: 0 }}>Mesa {cuenta.mesa_numero}</h1>
            <p className={base.muted}>
              Abierta {formatearFecha(cuenta.abierta_en)} por {cuenta.abierta_por ?? '—'}
              {cuenta.pidio_cuenta && ' · Pidió la cuenta'}
            </p>
          </div>
          <span className={styles.totalGrande}>{formatearMonto(cuenta.total)}</span>
        </div>
        <div className={base.formRow}>
          <button className={base.secondary} type="button" disabled={ocupado} onClick={() => void pedirCuenta()}>
            {cuenta.pidio_cuenta ? 'Quitar aviso de cuenta' : 'Pidió la cuenta'}
          </button>
          {cuenta.rondas === 0 && (
            <button className={base.danger} type="button" disabled={ocupado} onClick={() => void anular()}>
              Cerrar sin consumo
            </button>
          )}
        </div>
      </section>

      {cuenta.turno_cerrado && (
        <p className={base.aviso} role="status">
          Esta mesa quedó abierta de un turno anterior. Al cobrarla (o al pedir algo más) pasa a tu turno de hoy,
          así que necesitas tener un turno abierto.
        </p>
      )}

      {enviadas.length > 0 && (
        <section className={base.card}>
          <h2>Pedidos de la mesa</h2>
          {enviadas.map((ronda, i) => {
            const estado = estadoDe(ronda)
            const sePuedeCancelar =
              puedeCobrar && (estado === 'confirmado' || estado === 'en_preparacion' || (estado === 'listo' && esAdmin))
            return (
              <article key={ronda.id} className={styles.ronda}>
                <div className={styles.rondaCabecera}>
                  <strong>
                    Ronda {i + 1} · Ficha N° {ronda.numero_turno ?? '—'}
                  </strong>
                  <span>
                    <EstadoBadge estado={estado} /> <span className={base.muted}>{formatearFecha(ronda.fecha)}</span>
                  </span>
                </div>
                <DetalleItems
                  detalles={ronda.detalles}
                  total={ronda.total}
                  combos={combos}
                  editable={false}
                  onQuitarExtra={() => {}}
                />
                <div className={base.formRow}>
                  {estado === 'listo' && (
                    <button className={base.primary} type="button" disabled={ocupado} onClick={() => void entregar(ronda)}>
                      Entregada en la mesa
                    </button>
                  )}
                  {sePuedeCancelar && (
                    <button className={base.danger} type="button" disabled={ocupado} onClick={() => void cancelar(ronda)}>
                      Cancelar ronda
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {ajenos.length > 0 && (
        <p className={base.aviso} role="status">
          Hay {ajenos.length} ronda(s) armadas por otra persona que todavía no se envían a cocina.
        </p>
      )}

      <section className={base.card}>
        <h2>Nueva ronda</h2>
        {!miBorrador ? (
          <div>
            <button className={base.primary} type="button" disabled={ocupado} onClick={() => void nuevaRonda()}>
              Tomar pedido
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
                className={base.primary}
                type="button"
                disabled={ocupado || miBorrador.detalles.length === 0}
                onClick={() => void enviar(miBorrador)}
              >
                Enviar a cocina
              </button>
              <button className={base.secondary} type="button" disabled={ocupado} onClick={() => void descartar(miBorrador)}>
                Descartar
              </button>
            </div>
            {catalogo ? (
              <AgregarItemPanel pedidoId={miBorrador.id} catalogo={catalogo} onAgregado={recargar} silencioso />
            ) : (
              <p className={base.muted}>Cargando el menú…</p>
            )}
          </>
        )}
      </section>

      {puedeCobrar && cuenta.rondas > 0 && (
        <section className={base.card}>
          <h2>Cobrar</h2>
          <form className={base.formStack} onSubmit={iniciarCobro}>
            <div className={base.field}>
              <span>Descuento (opcional)</span>
              <div className={base.chips}>
                {(['porcentaje', 'monto'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={form.tipo === t ? base.chipActive : base.chip}
                    aria-pressed={form.tipo === t}
                    onClick={() => setForm({ ...form, tipo: t })}
                  >
                    {t === 'porcentaje' ? 'Porcentaje %' : 'Monto Bs'}
                  </button>
                ))}
              </div>
              <div className={base.formRow}>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder={form.tipo === 'porcentaje' ? 'Ej. 10' : 'Ej. 15'}
                  aria-label="Valor del descuento"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
                <input
                  className={base.grow}
                  maxLength={200}
                  placeholder="Motivo del descuento"
                  aria-label="Motivo del descuento"
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                />
              </div>
              {!esAdmin && (
                <small className={base.muted}>
                  El cajero da hasta {cuenta.tope_descuento_cajero} % de descuento.
                </small>
              )}
            </div>
            <div className={base.formRow}>
              <button className={`${base.primary} ${cajaStyles.confirmar}`} type="submit" disabled={ocupado}>
                Cobrar {formatearMonto(totalACobrar)}
              </button>
            </div>
          </form>
        </section>
      )}
    </section>
  )
}
