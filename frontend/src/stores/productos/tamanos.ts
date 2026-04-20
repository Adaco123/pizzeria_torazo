import { defineStore } from "pinia"
import { ref, computed } from "vue"
import {
  getTamanos, getTamano, createTamano, updateTamano, deleteTamano,
  type Tamano, type TamanoPayload
} from "@/services/tamano_service"
import { getErrorMessage } from "@/utils/errors.ts"

const CACHE_TTL = 5 * 60 * 1000

export const useStoreTamanos = defineStore("tamanos", () => {

  
  const tamanos             = ref<Tamano[]>([])
  const tamano_seleccionado = ref<Tamano | null>(null)
  const lastFetch           = ref<number | null>(null)
  const loading             = ref({ fetch: false, guardar: false, eliminar: false })
  const error               = ref<string | null>(null)

  
  const totalTamanos = computed(() => tamanos.value.length)

  const buscarPorNombre = computed(() => (termino: string) =>
    tamanos.value.filter(t =>
      t.nombre.toLowerCase().includes(termino.toLowerCase())
    )
  )

  
  function cacheEsValido(): boolean {
    return lastFetch.value !== null &&
           (Date.now() - lastFetch.value) < CACHE_TTL &&
           tamanos.value.length > 0
  }

  function invalidarCache(): void {
    lastFetch.value = null
  }

  
  async function fetchTamanos(force = false): Promise<void> {
    if (!force && (loading.value.fetch || cacheEsValido())) return

    loading.value.fetch = true
    error.value         = null
    try {
      const res        = await getTamanos()
      tamanos.value    = res.data
      lastFetch.value  = Date.now()
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function buscarTamano(id: number): Promise<void> {
    const enMemoria = tamanos.value.find(t => t.id === id)
    if (enMemoria) {
      tamano_seleccionado.value = enMemoria
      return
    }

    loading.value.fetch = true
    error.value         = null
    try {
      const res                 = await getTamano(id)
      tamano_seleccionado.value = res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function agregarTamano(payload: TamanoPayload): Promise<Tamano | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await createTamano(payload)
      tamanos.value.push(res.data)
      invalidarCache()
      return res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function editarTamano(id: number, payload: Partial<TamanoPayload>): Promise<Tamano | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res   = await updateTamano(id, payload)
      const index = tamanos.value.findIndex(t => t.id === id)
      if (index !== -1) tamanos.value[index] = res.data
      if (tamano_seleccionado.value?.id === id) {
        tamano_seleccionado.value = res.data
      }
      invalidarCache()
      return res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function eliminarTamano(id: number): Promise<boolean> {
    loading.value.eliminar = true
    error.value            = null
    try {
      await deleteTamano(id)
      tamanos.value = tamanos.value.filter(t => t.id !== id)
      if (tamano_seleccionado.value?.id === id) {
        tamano_seleccionado.value = null
      }
      invalidarCache()
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.eliminar = false
    }
  }

  return {
    
    tamanos, tamano_seleccionado, loading, error,
    
    totalTamanos, buscarPorNombre,
    
    fetchTamanos, buscarTamano, agregarTamano, editarTamano, eliminarTamano
  }
})