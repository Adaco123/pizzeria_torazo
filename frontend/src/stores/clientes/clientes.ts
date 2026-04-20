import { defineStore } from "pinia"
import { ref, computed } from "vue"
import {
  getClientes, getCliente, createCliente, updateCliente, deleteCliente,
  type Cliente, type ClientePayload
} from "@/services/cliente_service"
import { getErrorMessage } from "@/utils/errors.ts"

const CACHE_TTL = 5 * 60 * 1000 

export const useStoreClientes = defineStore("clientes", () => {

  
  const clientes             = ref<Cliente[]>([])
  const cliente_seleccionado = ref<Cliente | null>(null)
  const lastFetch            = ref<number | null>(null)
  const loading              = ref({ fetch: false, guardar: false, eliminar: false })
  const error                = ref<string | null>(null)

  
  const totalClientes = computed(() => clientes.value.length)

  const buscarPorNombre = computed(() => (termino: string) =>
    clientes.value.filter(c =>
      c.nombre.toLowerCase().includes(termino.toLowerCase()) ||
      (c.telefono ?? "").includes(termino)                   ||
      (c.nit     ?? "").includes(termino)
    )
  )

  
  function cacheEsValido(): boolean {
    return lastFetch.value !== null &&
           (Date.now() - lastFetch.value) < CACHE_TTL &&
           clientes.value.length > 0
  }

  function invalidarCache(): void {
    lastFetch.value = null
  }

  
  async function fetchClientes(force = false): Promise<void> {
    if (!force && (loading.value.fetch || cacheEsValido())) return

    loading.value.fetch = true
    error.value         = null
    try {
      const res          = await getClientes()
      clientes.value     = res.data
      lastFetch.value    = Date.now()   
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function buscarCliente(id: number): Promise<void> {
    
    const enMemoria = clientes.value.find(c => c.id === id)
    if (enMemoria) {
      cliente_seleccionado.value = enMemoria
      return
    }

    loading.value.fetch = true
    error.value         = null
    try {
      const res                  = await getCliente(id)
      cliente_seleccionado.value = res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function agregarCliente(payload: ClientePayload): Promise<Cliente | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await createCliente(payload)
      clientes.value.push(res.data.cliente)   
      invalidarCache()                         
      return res.data.cliente
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function editarCliente(id: number, payload: Partial<ClientePayload>): Promise<Cliente | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res   = await updateCliente(id, payload)
      const index = clientes.value.findIndex(c => c.id === id)
      if (index !== -1) clientes.value[index] = res.data.cliente  
      if (cliente_seleccionado.value?.id === id) {
        cliente_seleccionado.value = res.data.cliente              
      }
      invalidarCache()
      return res.data.cliente
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function eliminarCliente(id: number): Promise<boolean> {
    loading.value.eliminar = true
    error.value            = null
    try {
      await deleteCliente(id)
      clientes.value = clientes.value.filter(c => c.id !== id)    
      if (cliente_seleccionado.value?.id === id) {
        cliente_seleccionado.value = null                          
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
    
    clientes, cliente_seleccionado, loading, error,
    
    totalClientes, buscarPorNombre,
    
    fetchClientes, buscarCliente, agregarCliente, editarCliente, eliminarCliente
  }
})