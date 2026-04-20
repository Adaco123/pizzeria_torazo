import { defineStore } from "pinia"
import { ref, computed } from "vue"
import {
    getTurnos, getTurno, getTurnosAbiertos,
    createTurno, updateTurno, cerrarTurno, deleteTurno,
    type Turno
} from "@/services/service_turno"
import { getResumenTurno, type ResumenTurno } from "@/services/service_turno"  
import { getErrorMessage } from "@/utils/errors.ts"

const CACHE_TTL = 5 * 60 * 1000

export const useStoreTurnos = defineStore("turnos", () => {

    
    const turnos             = ref<Turno[]>([])
    const turno_seleccionado = ref<Turno | null>(null)
    const resumen_turno      = ref<ResumenTurno | null>(null)   
    const lastFetch          = ref<number | null>(null)
    const loading            = ref({
        fetch:   false,
        guardar: false,
        eliminar: false,
        cerrar:  false,
        resumen: false,   
    })
    const error = ref<string | null>(null)

    
    const totalTurnos = computed(() => turnos.value.length)

    const turnosAbiertos = computed(() =>
        turnos.value.filter(t => t.abierto)
    )

    const turnosCerrados = computed(() =>
        turnos.value.filter(t => !t.abierto)
    )

    const buscarPorUsuario = computed(() => (usuario_id: number) =>
        turnos.value.filter(t => t.usuario_id === usuario_id)
    )

    
    function cacheEsValido(): boolean {
        return lastFetch.value !== null &&
               (Date.now() - lastFetch.value) < CACHE_TTL &&
               turnos.value.length > 0
    }

    function invalidarCache(): void {
        lastFetch.value = null
    }

    
    async function fetchTurnos(force = false): Promise<void> {
        if (!force && (loading.value.fetch || cacheEsValido())) return

        loading.value.fetch = true
        error.value         = null
        try {
            const res       = await getTurnos()
            turnos.value    = res.data.data
            lastFetch.value = Date.now()
        } catch (err: unknown) {
            error.value = getErrorMessage(err)
        } finally {
            loading.value.fetch = false
        }
    }

    async function fetchTurnosAbiertos(): Promise<void> {
        loading.value.fetch = true
        error.value         = null
        try {
            const res    = await getTurnosAbiertos()
            turnos.value = res.data.data
        } catch (err: unknown) {
            error.value = getErrorMessage(err)
        } finally {
            loading.value.fetch = false
        }
    }

    async function buscarTurno(id: number): Promise<void> {
        const enMemoria = turnos.value.find(t => t.id === id)
        if (enMemoria) {
            turno_seleccionado.value = enMemoria
            return
        }
        loading.value.fetch = true
        error.value         = null
        try {
            const res                = await getTurno(id)
            turno_seleccionado.value = res.data.data
        } catch (err: unknown) {
            error.value = getErrorMessage(err)
        } finally {
            loading.value.fetch = false
        }
    }

    async function restaurarTurno(usuario_id: number): Promise<Turno | null> {
        const savedId = localStorage.getItem(`turno_activo_${usuario_id}`)
        if (!savedId) return null

        loading.value.fetch = true
        error.value         = null
        try {
            const res   = await getTurno(Number(savedId))
            const turno = res.data.data
            if (turno.abierto && turno.usuario_id === usuario_id) {
                turno_seleccionado.value = turno
                return turno
            } else {
                localStorage.removeItem(`turno_activo_${usuario_id}`)
                return null
            }
        } catch {
            localStorage.removeItem(`turno_activo_${usuario_id}`)
            return null
        } finally {
            loading.value.fetch = false
        }
    }

    async function abrirTurno(usuario_id: number, monto_inicio: number = 0): Promise<Turno | null> {
        loading.value.guardar = true
        error.value           = null
        try {
            const res = await createTurno(usuario_id, monto_inicio)
            turnos.value.unshift(res.data.data)
            invalidarCache()
            localStorage.setItem(`turno_activo_${usuario_id}`, String(res.data.data.id))
            return res.data.data
        } catch (err: unknown) {
            error.value = getErrorMessage(err)
            return null
        } finally {
            loading.value.guardar = false
        }
    }

    async function editarTurno(
        id: number,
        data: Partial<Pick<Turno, "monto_inicio" | "monto_cierre" | "cierre">>
    ): Promise<Turno | null> {
        loading.value.guardar = true
        error.value           = null
        try {
            const res   = await updateTurno(id, data)
            const index = turnos.value.findIndex(t => t.id === id)
            if (index !== -1) turnos.value[index] = res.data.data
            if (turno_seleccionado.value?.id === id) {
                turno_seleccionado.value = res.data.data
            }
            invalidarCache()
            return res.data.data
        } catch (err: unknown) {
            error.value = getErrorMessage(err)
            return null
        } finally {
            loading.value.guardar = false
        }
    }

    async function cerrarTurnoAction(id: number, monto_cierre: number): Promise<Turno | null> {
        loading.value.cerrar = true
        error.value          = null
        try {
            const res   = await cerrarTurno(id, monto_cierre)
            const index = turnos.value.findIndex(t => t.id === id)
            if (index !== -1) turnos.value[index] = res.data.data
            if (turno_seleccionado.value?.id === id) {
                turno_seleccionado.value = res.data.data
            }
            invalidarCache()
            const keyAEliminar = Object.keys(localStorage).find(
                k => k.startsWith("turno_activo_") && localStorage.getItem(k) === String(id)
            )
            if (keyAEliminar) localStorage.removeItem(keyAEliminar)
            return res.data.data
        } catch (err: unknown) {
            error.value = getErrorMessage(err)
            return null
        } finally {
            loading.value.cerrar = false
        }
    }

    async function eliminarTurno(id: number): Promise<boolean> {
        loading.value.eliminar = true
        error.value            = null
        try {
            await deleteTurno(id)
            turnos.value = turnos.value.filter(t => t.id !== id)
            if (turno_seleccionado.value?.id === id) {
                turno_seleccionado.value = null
            }
            invalidarCache()
            const keyAEliminar = Object.keys(localStorage).find(
                k => k.startsWith("turno_activo_") && localStorage.getItem(k) === String(id)
            )
            if (keyAEliminar) localStorage.removeItem(keyAEliminar)
            return true
        } catch (err: unknown) {
            error.value = getErrorMessage(err)
            return false
        } finally {
            loading.value.eliminar = false
        }
    }

    
    async function fetchResumenTurno(turnoId: number): Promise<ResumenTurno | null> {
        loading.value.resumen = true
        error.value           = null
        resumen_turno.value   = null
        try {
            const res           = await getResumenTurno(turnoId)
            resumen_turno.value = res.data.data
            return res.data.data
        } catch (err: unknown) {
            error.value = getErrorMessage(err)
            return null
        } finally {
            loading.value.resumen = false
        }
    }

    return {
        
        turnos, turno_seleccionado, resumen_turno, loading, error,
        
        totalTurnos, turnosAbiertos, turnosCerrados, buscarPorUsuario,
        
        fetchTurnos, fetchTurnosAbiertos, buscarTurno,
        abrirTurno, editarTurno, cerrarTurnoAction, eliminarTurno,
        restaurarTurno,
        
        fetchResumenTurno,
    }
})