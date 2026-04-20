import { defineStore } from "pinia"
import { ref, computed } from "vue"
import {
  getUsuarios, getUsuarioMe, updateUsuario, cambiarContrasena,
  registrarUsuario as registrarUsuarioService,   
  type Usuario, type UsuarioPayload, type UsuarioEditPayload, type CambiarContrasenaPayload
} from "@/services/usuario_service"
import { getErrorMessage } from "@/utils/errors"

const CACHE_TTL = 5 * 60 * 1000

export const useStoreUsuarios = defineStore("usuarios", () => {

  
  const usuarios             = ref<Usuario[]>([])
  const usuario_actual       = ref<Usuario | null>(null)
  const usuario_seleccionado = ref<Usuario | null>(null)
  const lastFetch            = ref<number | null>(null)
  const loading              = ref({ fetch: false, guardar: false, contrasena: false })
  const error                = ref<string | null>(null)

  
  const totalUsuarios = computed(() => usuarios.value.length)

  const usuariosActivos = computed(() =>
    usuarios.value.filter(u => u.activo)
  )

  const buscarPorNombre = computed(() => (termino: string) =>
    usuarios.value.filter(u =>
      u.nombre.toLowerCase().includes(termino.toLowerCase()) ||
      u.correo.toLowerCase().includes(termino.toLowerCase()) ||
      (u.cedula ?? "").includes(termino)                     ||
      (u.codigo ?? "").includes(termino)
    )
  )

  const porRol = computed(() => (rol: string) =>
    usuarios.value.filter(u => u.rol === rol)
  )

  
  function cacheEsValido(): boolean {
    return lastFetch.value !== null &&
           (Date.now() - lastFetch.value) < CACHE_TTL &&
           usuarios.value.length > 0
  }

  function invalidarCache(): void {
    lastFetch.value = null
  }

  
  async function registrarUsuario(payload: UsuarioPayload): Promise<Usuario | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res = await registrarUsuarioService(payload)  
      usuarios.value.push(res.data.user)
      invalidarCache()
      return res.data.user
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function fetchUsuarios(
    params?: { rol?: string; activo?: boolean },
    force = false
  ): Promise<void> {
    if (!force && (loading.value.fetch || cacheEsValido())) return

    loading.value.fetch = true
    error.value         = null
    try {
      const res         = await getUsuarios(params)
      usuarios.value    = res.data.users
      lastFetch.value   = Date.now()
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function fetchUsuarioActual(): Promise<void> {
    loading.value.fetch = true
    error.value         = null
    try {
      const res            = await getUsuarioMe()
      usuario_actual.value = res.data.user
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value.fetch = false
    }
  }

  async function editarUsuario(
    id: number,
    payload: UsuarioEditPayload
  ): Promise<Usuario | null> {
    loading.value.guardar = true
    error.value           = null
    try {
      const res   = await updateUsuario(id, payload)
      const index = usuarios.value.findIndex(u => u.id === id)
      if (index !== -1) usuarios.value[index] = res.data.user
      if (usuario_seleccionado.value?.id === id) {
        usuario_seleccionado.value = res.data.user
      }
      if (usuario_actual.value?.id === id) {
        usuario_actual.value = res.data.user
      }
      invalidarCache()
      return res.data.user
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return null
    } finally {
      loading.value.guardar = false
    }
  }

  async function cambiarPassword(
    payload: CambiarContrasenaPayload
  ): Promise<boolean> {
    loading.value.contrasena = true
    error.value              = null
    try {
      await cambiarContrasena(payload)
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      loading.value.contrasena = false
    }
  }

  function seleccionarUsuario(usuario: Usuario | null): void {
    usuario_seleccionado.value = usuario
  }

  function limpiarError(): void {
    error.value = null
  }

  return {
    
    usuarios, usuario_actual, usuario_seleccionado, loading, error,
    
    totalUsuarios, usuariosActivos, buscarPorNombre, porRol,
    
    fetchUsuarios, fetchUsuarioActual, registrarUsuario, editarUsuario, cambiarPassword,
    seleccionarUsuario, limpiarError
  }
})