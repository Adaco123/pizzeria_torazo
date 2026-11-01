import { useState } from 'react'
import type { Ingrediente } from '../../../apis/ingredientes.ts'
import type { Producto } from '../../../apis/productos.ts'
import { precioExtra, totalExtras } from '../../pedidos/extras.ts'
import type { Catalogo } from '../../pedidos/useCatalogo.ts'
import type { DatosPizza } from './useDatosPizzas.ts'
import { leerUso, ordenarPorUso } from './usoLocal.ts'

export interface Opcion {
  tamanoId: number | null
  nombre: string
  precio: number
}

export type Lado = 0 | 1
export type Extras = Record<number, number>
export type ExtrasPorMitad = [Extras, Extras]

const RAPIDOS = 8
const MAXIMO_EXTRA = 9

interface Params {
  pizza: Producto
  opciones: Opcion[]
  catalogo: Catalogo
  /** Pizzas que se pueden poner de segunda mitad (vacío si este producto no admite mitad y mitad). */
  candidatas: Producto[]
  datosDe: (productoId: number) => DatosPizza | undefined
}

/**
 * Todo lo que el cajero va armando en el círculo: tamaño, extras (por mitad si es mitad y mitad),
 * la segunda pizza, la nota y el precio. El precio es solo una vista previa: lo calcula el servidor.
 */
export function useSelectorPizza({ pizza, opciones, catalogo, candidatas, datosDe }: Params) {
  const N = opciones.length
  const [indice, setIndice] = useState(Math.min(1, N - 1))
  const [mitad, setMitad] = useState(false)
  const [segundaId, setSegundaId] = useState<number | null>(null)
  const [lado, setLado] = useState<Lado>(0)
  const [extras, setExtras] = useState<ExtrasPorMitad>([{}, {}])
  const [nota, setNota] = useState('')

  const [uso] = useState(leerUso)
  const [todos] = useState(() => catalogo.ingredientes.filter((i) => i.activo))
  const [rapidos] = useState(() => ordenarPorUso(todos, uso.extras, 'id').slice(0, RAPIDOS))

  const tamano = opciones[indice]
  const segunda = candidatas.find((c) => c.id === segundaId) ?? null
  const hayMitad = mitad && segunda !== null
  // Mitad y mitad exige un tamaño real (no el precio base) y otra pizza para combinar.
  const puedeMitad = tamano.tamanoId !== null && candidatas.length > 0
  const ladoActivo: Lado = hayMitad ? lado : 0

  // En mitad y mitad el servidor solo cobra el extra configurado para el tamaño.
  const precioDe = (i: Ingrediente) => precioExtra(i, tamano.tamanoId, catalogo.preciosExtra, hayMitad)

  const precioEnTamano = (p: Producto): number | null =>
    datosDe(p.id)?.precios.find((x) => x.tamano_id === tamano.tamanoId)?.precio ?? null
  const precioSegunda = hayMitad ? precioEnTamano(segunda) : null
  const problema =
    hayMitad && precioSegunda === null ? `½ ${segunda.nombre} no tiene tamaño ${tamano.nombre}` : null

  const precioPizza = hayMitad && precioSegunda !== null ? Math.max(tamano.precio, precioSegunda) : tamano.precio
  const extrasTotal =
    totalExtras(extras[0], todos, tamano.tamanoId, catalogo.preciosExtra, hayMitad) +
    (hayMitad ? totalExtras(extras[1], todos, tamano.tamanoId, catalogo.preciosExtra, true) : 0)
  const total = Math.round((precioPizza + extrasTotal) * 100) / 100

  /** Las pizzas que más se piden primero, para elegir la otra mitad con un toque. */
  const porUso = ordenarPorUso(candidatas, uso.productos)

  function sumar(id: number) {
    setExtras((e) => {
      const copia: ExtrasPorMitad = [{ ...e[0] }, { ...e[1] }]
      copia[ladoActivo][id] = Math.min(MAXIMO_EXTRA, (copia[ladoActivo][id] ?? 0) + 1)
      return copia
    })
  }

  function quitar(id: number) {
    setExtras((e) => {
      const copia: ExtrasPorMitad = [{ ...e[0] }, { ...e[1] }]
      const actual = copia[ladoActivo][id] ?? 0
      if (actual > 1) copia[ladoActivo][id] = actual - 1
      else delete copia[ladoActivo][id]
      return copia
    })
  }

  function alternarMitad() {
    if (mitad) {
      setMitad(false)
      setLado(0)
      setExtras((e) => [e[0], {}])
      return
    }
    setMitad(true)
    setLado(0)
    if (segundaId === null || !candidatas.some((c) => c.id === segundaId)) {
      const conPrecio = porUso.find((p) => precioEnTamano(p) !== null) ?? porUso[0]
      setSegundaId(conPrecio?.id ?? null)
    }
  }

  function elegirTamano(z: number, ladoClic?: Lado) {
    setIndice(z)
    if (hayMitad && ladoClic !== undefined) setLado(ladoClic)
  }

  return {
    N, indice, tamano, elegirTamano,
    mitad, hayMitad, puedeMitad, alternarMitad,
    segunda, elegirSegunda: setSegundaId, porUso,
    lado: ladoActivo, setLado,
    extras, extrasActivos: extras[ladoActivo], sumar, quitar,
    nota, setNota,
    todos, rapidos, precioDe, precioPizza, extrasTotal, total, problema,
    nombreDe: (id: number) => todos.find((i) => i.id === id)?.nombre ?? '',
    pizza,
  }
}

export type SelectorApi = ReturnType<typeof useSelectorPizza>
