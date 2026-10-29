import { PlanoMesas } from '../features/mesas/PlanoMesas.tsx'
import base from '../features/pedidos/Pedidos.module.css'

export function MesasPage() {
  return (
    <section className={base.page}>
      <h1>Mesas</h1>
      <p className={base.muted}>
        Toca una mesa libre para abrirla cuando se sienten los clientes. Las mesas ocupadas muestran lo
        que llevan; en naranja, las que ya pidieron la cuenta.
      </p>
      <PlanoMesas />
    </section>
  )
}
