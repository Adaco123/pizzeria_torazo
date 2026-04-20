import { defineStore } from "pinia"
import { ref } from "vue"
import { getPersonal, type Usuario } from "@/services/admin_service"

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { error?: string } } }).response
    return response?.data?.error ?? "Error desconocido"
  }
  return "Error desconocido"
}

export const useStorePersonal = defineStore("personal", () => {  

  
  const usuarios = ref<Usuario[]>([])
  const loading  = ref(false)
  const error    = ref<string | null>(null)

  
  async function fetchPersonal() {
    if (loading.value) return
    loading.value = true
    error.value   = null
    try {
      const res      = await getPersonal()
      usuarios.value = res.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  return { usuarios, loading, error, fetchPersonal }  
})