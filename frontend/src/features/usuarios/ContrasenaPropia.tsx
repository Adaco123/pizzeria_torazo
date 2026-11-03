import { useId } from 'react'
import base from '../pedidos/Pedidos.module.css'
import { CampoContrasena } from './CampoContrasena.tsx'
import form from './Contrasena.module.css'
import styles from './Cuenta.module.css'
import { FuerzaContrasena } from './FuerzaContrasena.tsx'
import { ETIQUETA_NIVEL, MINIMO_CONTRASENA, nivelDeContrasena } from './seguridad.ts'
import { useContrasena } from './useContrasena.ts'

/**
 * Cambiar mi contraseña. Sigue el esquema de la caja: los campos al centro y, a la derecha,
 * un ticket con la seguridad de la contraseña y el botón grande al pie.
 * Devuelve dos columnas de la rejilla de «Mi cuenta».
 */
export function ContrasenaPropia() {
  const idFormulario = useId()
  const { actual, setActual, nueva, setNueva, repetida, setRepetida, enviando, guardar } = useContrasena({
    modo: 'propia',
  })
  const completo = actual !== '' && nueva !== '' && repetida !== ''

  return (
    <>
      <section className={base.card}>
        <h2>Cambiar mi contraseña</h2>
        <p className={base.muted}>Usa una que no uses en otros sitios. Tu sesión en este equipo sigue abierta.</p>
        <form id={idFormulario} className={form.form} onSubmit={guardar}>
          <CampoContrasena
            etiqueta="Contraseña actual"
            valor={actual}
            onCambio={setActual}
            autoComplete="current-password"
          />
          <div className={form.par}>
            <CampoContrasena
              etiqueta={`Contraseña nueva (mínimo ${MINIMO_CONTRASENA} caracteres)`}
              valor={nueva}
              onCambio={setNueva}
              autoComplete="new-password"
            />
            <CampoContrasena
              etiqueta="Repite la contraseña nueva"
              valor={repetida}
              onCambio={setRepetida}
              autoComplete="new-password"
            />
          </div>
        </form>
      </section>

      <aside className={styles.ticket} aria-label="Seguridad de la contraseña">
        <div className={styles.cabeza}>
          <h2>
            Seguridad <b>{ETIQUETA_NIVEL[nivelDeContrasena(nueva)]}</b>
          </h2>
        </div>
        <div className={styles.cuerpo}>
          <FuerzaContrasena nueva={nueva} repetida={repetida} actual={actual} plana />
        </div>
        <div className={styles.pie}>
          <button className={styles.cambiar} type="submit" form={idFormulario} disabled={enviando || !completo}>
            {enviando ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </aside>
    </>
  )
}
