import { ArrowLeft, Banknote, CreditCard, HandCoins, QrCode, Split, Wallet, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { MetodoPago } from '../../apis/pagos.ts'
import type { PagoCobro } from '../../apis/pedidos.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import { redondear } from '../cobro/facturacion.ts'
import ui from '../admin/Ui.module.css'
import base from '../pedidos/Pedidos.module.css'
import type { TipoEntregaNombre } from '../pedidos/estados.ts'
import { esperaSugerida, OPCIONES_ESPERA } from './espera.ts'
import { armarPagos, esEfectivo, sugerenciasDeRecibido, type ModoPago } from './pagos.ts'
import styles from './Caja.module.css'

interface Props {
  total: number
  metodos: MetodoPago[]
  ocupado: boolean
  /** Tipo de entrega: decide los minutos de espera que se sugieren. */
  tipo: TipoEntregaNombre
  /** `minutosEspera` solo viene si el cajero cambió la sugerencia. */
  onConfirmar: (pagos: PagoCobro[], minutosEspera?: number) => void
  onVolver: () => void
  /** Cuenta de una mesa: la comida ya salió a cocina, no se promete hora. */
  sinEspera?: boolean
  textoVolver?: string
}

function iconoDeMetodo(nombre: string): LucideIcon {
  const n = nombre.trim().toLowerCase()
  if (n.includes('efectivo')) return Banknote
  if (n.includes('qr')) return QrCode
  if (n.includes('tarjeta') || n.includes('débito') || n.includes('debito') || n.includes('crédito') || n.includes('credito')) return CreditCard
  return Wallet
}

interface AtajosProps {
  total: number
  recibido: string
  onElegir: (texto: string) => void
}

/** Botones para llenar "con cuánto paga el cliente" sin teclear. */
function AtajosDeRecibido({ total, recibido, onElegir }: AtajosProps) {
  return (
    <div className={styles.atajos} role="group" aria-label="Con cuánto paga el cliente">
      <button
        type="button"
        className={recibido === '' ? base.chipActive : base.chip}
        onClick={() => onElegir('')}
      >
        Exacto
      </button>
      {sugerenciasDeRecibido(total).map((billete) => (
        <button
          key={billete}
          type="button"
          className={recibido === String(billete) ? base.chipActive : base.chip}
          onClick={() => onElegir(String(billete))}
        >
          {billete}
        </button>
      ))}
    </div>
  )
}

export function PanelCobro({
  total,
  metodos,
  ocupado,
  tipo,
  onConfirmar,
  onVolver,
  sinEspera = false,
  textoVolver = 'Volver al pedido',
}: Props) {
  const efectivo = metodos.find((m) => esEfectivo(m))
  const otros = metodos.filter((m) => !esEfectivo(m))
  const puedeDividir = efectivo !== undefined && otros.length > 0

  const [modo, setModo] = useState<ModoPago>('unico')
  const [metodoId, setMetodoId] = useState<number | null>((efectivo ?? metodos[0])?.id ?? null)
  const [otroMetodoId, setOtroMetodoId] = useState<number | null>(otros[0]?.id ?? null)
  const [recibido, setRecibido] = useState('')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [intentado, setIntentado] = useState(false)
  const sugerida = esperaSugerida(tipo)
  const [espera, setEspera] = useState(sugerida)

  const resultado = armarPagos({ total, metodos, modo, metodoId, recibido, montoEfectivo, otroMetodoId })
  const metodoUnico = metodos.find((m) => m.id === metodoId)
  const parteEfectivo = parseMonto(montoEfectivo)
  const resto = parteEfectivo === null ? null : redondear(total - parteEfectivo)

  function elegirMetodo(id: number) {
    setModo('unico')
    setMetodoId(id)
    setRecibido('')
  }

  function dividir() {
    setModo('dividido')
    setRecibido('')
  }

  function confirmar() {
    setIntentado(true)
    if (resultado.ok) onConfirmar(resultado.pagos, espera === sugerida ? undefined : espera)
  }

  if (metodos.length === 0) {
    return (
      <section className={styles.cobroTicket}>
        <div className={styles.cobroCab}>
          <b>Cobrar</b>
        </div>
        <div className={styles.cobroCuerpo}>
          <p className={base.error} role="alert">
            No hay métodos de pago configurados.
          </p>
          <button className={`${ui.btn} ${ui.secundario}`} type="button" onClick={onVolver}>
            <ArrowLeft size={16} aria-hidden="true" /> {textoVolver}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.cobroTicket} aria-label="Cobro del pedido">
      <div className={styles.cobroCab}>
        <b>Cobrar</b>
        <button className={`${ui.btn} ${ui.secundario}`} type="button" disabled={ocupado} onClick={onVolver}>
          <ArrowLeft size={16} aria-hidden="true" /> {textoVolver}
        </button>
      </div>
      <div className={styles.cobroCuerpo}>
      <div className={styles.cobroTotal}>
        <span className={base.muted}>Total a cobrar</span>
        <strong>{formatearMonto(total)}</strong>
      </div>

      <div className={base.field}>
        <span>Cómo paga</span>
        <div className={styles.metodos}>
          {metodos.map((m) => {
            const Icono = iconoDeMetodo(m.nombre)
            const activo = modo === 'unico' && m.id === metodoId
            return (
              <button
                key={m.id}
                type="button"
                className={styles.metodo}
                aria-pressed={activo}
                onClick={() => elegirMetodo(m.id)}
              >
                <Icono size={20} aria-hidden="true" />
                {m.nombre}
              </button>
            )
          })}
          {puedeDividir && (
            <button type="button" className={styles.metodo} aria-pressed={modo === 'dividido'} onClick={dividir}>
              <Split size={20} aria-hidden="true" />
              Dividir el pago
            </button>
          )}
        </div>
      </div>

      {modo === 'unico' && esEfectivo(metodoUnico) && (
        <div className={base.field}>
          <span>El cliente entrega</span>
          <AtajosDeRecibido total={total} recibido={recibido} onElegir={setRecibido} />
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="Otro monto"
            aria-label="Efectivo recibido"
            value={recibido}
            onChange={(e) => setRecibido(e.target.value)}
          />
        </div>
      )}

      {modo === 'unico' && metodoUnico && !esEfectivo(metodoUnico) && (
        <p className={base.muted}>
          Cobra {formatearMonto(total)} con {metodoUnico.nombre}. Confirma cuando el pago esté hecho.
        </p>
      )}

      {modo === 'dividido' && (
        <div className={base.formStack}>
          <label className={base.field}>
            <span>Paga en efectivo (Bs)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={montoEfectivo}
              onChange={(e) => setMontoEfectivo(e.target.value)}
            />
          </label>

          <div className={base.field}>
            <span>El resto{resto !== null && resto > 0 ? ` (${formatearMonto(resto)})` : ''} con</span>
            <div className={base.chips}>
              {otros.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={m.id === otroMetodoId ? base.chipActive : base.chip}
                  aria-pressed={m.id === otroMetodoId}
                  onClick={() => setOtroMetodoId(m.id)}
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          </div>

          {parteEfectivo !== null && parteEfectivo > 0 && (
            <div className={base.field}>
              <span>El cliente entrega en efectivo</span>
              <AtajosDeRecibido total={parteEfectivo} recibido={recibido} onElegir={setRecibido} />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Otro monto"
                aria-label="Efectivo recibido"
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {!sinEspera && (
      <div className={base.field}>
        <span>Se lo prometes en</span>
        <div className={base.chips} role="group" aria-label="Minutos de espera">
          {OPCIONES_ESPERA.map((minutos) => (
            <button
              key={minutos}
              type="button"
              className={minutos === espera ? base.chipActive : base.chip}
              aria-pressed={minutos === espera}
              onClick={() => setEspera(minutos)}
            >
              {minutos} min
            </button>
          ))}
        </div>
      </div>
      )}

      {resultado.ok && resultado.vuelto > 0 && (
        <p className={styles.vuelto}>
          Vuelto <strong>{formatearMonto(resultado.vuelto)}</strong>
        </p>
      )}

      {intentado && !resultado.ok && (
        <p className={base.error} role="alert">
          {resultado.error}
        </p>
      )}

      <button className={styles.cobroGrande} type="button" disabled={ocupado} onClick={confirmar}>
        <HandCoins size={18} aria-hidden="true" /> {ocupado ? 'Cobrando…' : `Confirmar cobro ${formatearMonto(total)}`}
      </button>
      </div>
    </section>
  )
}
