import { useState } from 'react'
import { ingredientesApi } from '../../api.ts'
import type { Ingrediente, IngredienteTamano, Tamano } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto, mensajeDeError, parseMonto } from '../../utils/formato.ts'
import styles from './Catalogo.module.css'

interface Props {
  ingredientes: Ingrediente[]
  tamanos: Tamano[]
  precios: IngredienteTamano[]
  recargar: () => void
}

const clave = (ingredienteId: number, tamanoId: number) => `${ingredienteId}-${tamanoId}`

/**
 * Precio extra de cada ingrediente según el tamaño. Una celda vacía significa "sin precio
 * para ese tamaño". Cada fila se guarda con su botón y solo envía lo que cambió.
 * (El padre debe darle un `key` que cambie cuando cambian los precios, para reiniciar los campos.)
 */
export function MatrizPreciosIngredientes({ ingredientes, tamanos, precios, recargar }: Props) {
  const toast = useToast()
  const guardados = new Map(precios.map((p) => [clave(p.ingrediente_id, p.tamano_id), p.precio_extra]))
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(precios.map((p) => [clave(p.ingrediente_id, p.tamano_id), String(p.precio_extra)])),
  )
  const [guardandoId, setGuardandoId] = useState<number | null>(null)

  if (tamanos.length === 0) {
    return <p className={styles.muted}>Crea primero algún tamaño para poder ponerle precio a los extras.</p>
  }

  function filaModificada(ingrediente: Ingrediente): boolean {
    return tamanos.some((t) => {
      const k = clave(ingrediente.id, t.id)
      const escrito = (valores[k] ?? '').trim()
      const actual = guardados.get(k)
      return actual === undefined ? escrito !== '' : escrito === '' || parseMonto(escrito) !== actual
    })
  }

  async function guardarFila(ingrediente: Ingrediente) {
    const operaciones: { descripcion: string; ejecutar: () => Promise<unknown> }[] = []

    for (const tamano of tamanos) {
      const k = clave(ingrediente.id, tamano.id)
      const escrito = (valores[k] ?? '').trim()
      const actual = guardados.get(k)

      if (escrito === '') {
        if (actual !== undefined) {
          operaciones.push({
            descripcion: tamano.nombre,
            ejecutar: () => ingredientesApi.eliminarPrecioPorTamano(ingrediente.id, tamano.id),
          })
        }
        continue
      }

      const precio = parseMonto(escrito)
      if (precio === null) {
        toast.error(`Precio inválido para ${ingrediente.nombre} (${tamano.nombre})`)
        return
      }
      if (actual === undefined) {
        operaciones.push({
          descripcion: tamano.nombre,
          ejecutar: () =>
            ingredientesApi.crearPrecioPorTamano({
              ingrediente_id: ingrediente.id,
              tamano_id: tamano.id,
              precio_extra: precio,
            }),
        })
      } else if (precio !== actual) {
        operaciones.push({
          descripcion: tamano.nombre,
          ejecutar: () => ingredientesApi.actualizarPrecioPorTamano(ingrediente.id, tamano.id, precio),
        })
      }
    }

    if (operaciones.length === 0) return

    setGuardandoId(ingrediente.id)
    let hechas = 0
    try {
      for (const operacion of operaciones) {
        await operacion.ejecutar()
        hechas += 1
      }
      toast.exito(`Precios de ${ingrediente.nombre} guardados`)
    } catch (e) {
      toast.error(`No se pudo guardar ${operaciones[hechas].descripcion} de ${ingrediente.nombre}: ${mensajeDeError(e)}`)
    } finally {
      setGuardandoId(null)
      recargar()
    }
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ingrediente</th>
            <th className={styles.num}>Base</th>
            {tamanos.map((t) => (
              <th key={t.id}>{t.nombre}</th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ingredientes.map((ingrediente) => (
            <tr key={ingrediente.id} className={ingrediente.activo ? undefined : styles.inactiva}>
              <td>{ingrediente.nombre}</td>
              <td className={styles.num}>{formatearMonto(ingrediente.precio_extra)}</td>
              {tamanos.map((tamano) => {
                const k = clave(ingrediente.id, tamano.id)
                return (
                  <td key={tamano.id}>
                    <input
                      className={styles.inlineInput}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="—"
                      aria-label={`${ingrediente.nombre}, tamaño ${tamano.nombre}`}
                      value={valores[k] ?? ''}
                      onChange={(e) => setValores((v) => ({ ...v, [k]: e.target.value }))}
                    />
                  </td>
                )
              })}
              <td>
                <button
                  className={styles.primary}
                  type="button"
                  disabled={guardandoId !== null || !filaModificada(ingrediente)}
                  onClick={() => guardarFila(ingrediente)}
                >
                  {guardandoId === ingrediente.id ? 'Guardando…' : 'Guardar'}
                </button>
              </td>
            </tr>
          ))}
          {ingredientes.length === 0 && (
            <tr>
              <td colSpan={tamanos.length + 3} className={styles.muted}>
                Todavía no hay ingredientes.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}