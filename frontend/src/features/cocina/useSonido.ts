import { useCallback, useEffect, useRef, useState } from 'react'

/** Dos tonos cortos ("ding-dong"). */
function sonar(contexto: AudioContext): void {
  const inicio = contexto.currentTime
  for (const [i, frecuencia] of [880, 660].entries()) {
    const oscilador = contexto.createOscillator()
    const volumen = contexto.createGain()
    const desde = inicio + i * 0.22
    oscilador.type = 'sine'
    oscilador.frequency.value = frecuencia
    volumen.gain.setValueAtTime(0.0001, desde)
    volumen.gain.exponentialRampToValueAtTime(0.4, desde + 0.02)
    volumen.gain.exponentialRampToValueAtTime(0.0001, desde + 0.4)
    oscilador.connect(volumen).connect(contexto.destination)
    oscilador.start(desde)
    oscilador.stop(desde + 0.45)
  }
}

/**
 * Suena cuando aparece un id que antes no estaba en `ids`.
 *
 * - `ids` es null mientras se carga: la primera lista real solo se memoriza, no suena
 *   (si no, sonaría por todos los pedidos que ya estaban al abrir la pantalla).
 * - El navegador solo deja reproducir audio después de un clic, por eso el sonido se
 *   activa con un botón en cada sesión.
 */
export function useAvisoSonoro(ids: number[] | null) {
  const [activo, setActivo] = useState(false)
  const contexto = useRef<AudioContext | null>(null)
  const vistos = useRef<Set<number> | null>(null)
  const activoRef = useRef(activo)

  useEffect(() => {
    activoRef.current = activo
  }, [activo])

  useEffect(() => {
    if (ids === null) return
    if (vistos.current === null) {
      vistos.current = new Set(ids)
      return
    }
    const nuevos = ids.filter((id) => !vistos.current?.has(id))
    for (const id of ids) vistos.current.add(id)
    if (nuevos.length === 0 || !activoRef.current || !contexto.current) return

    const ctx = contexto.current
    if (ctx.state === 'suspended') void ctx.resume().then(() => sonar(ctx))
    else sonar(ctx)
  }, [ids])

  const alternar = useCallback(() => {
    const siguiente = !activoRef.current
    if (siguiente) {
      // El contexto se crea dentro del clic: así el navegador permite el audio.
      contexto.current ??= new window.AudioContext()
      void contexto.current.resume().then(() => sonar(contexto.current as AudioContext))
    }
    setActivo(siguiente)
  }, [])

  return { activo, alternar }
}
