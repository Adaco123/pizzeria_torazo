import { BarraCuenta } from '../features/usuarios/BarraCuenta.tsx'
import { ContrasenaForm } from '../features/usuarios/ContrasenaForm.tsx'
import cuenta from '../features/usuarios/Cuenta.module.css'
import { MisPantallas } from '../features/usuarios/MisPantallas.tsx'
import base from '../features/pedidos/Pedidos.module.css'

/** Pantalla de cada usuario, sea cual sea su rol. Mismo esquema que Pedidos (caja). */
export function CuentaPage() {
  return (
    <section className={`${base.page} ${base.pageAncha}`}>
      <BarraCuenta />
      <div className={cuenta.layout}>
        <MisPantallas />
        <ContrasenaForm modo="propia" />
      </div>
    </section>
  )
}
