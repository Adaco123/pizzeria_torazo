import { useParams } from 'react-router'
import { CuentaMesaView } from '../features/mesas/CuentaMesaView.tsx'
import base from '../features/pedidos/Pedidos.module.css'

export function CuentaMesaPage() {
  const { id } = useParams()
  const cuentaId = Number(id)
  if (!Number.isInteger(cuentaId) || cuentaId < 1) return <h1 className={base.page}>Mesa no válida</h1>
  // `key` reinicia el estado al pasar de una mesa a otra.
  return <CuentaMesaView key={cuentaId} cuentaId={cuentaId} />
}
