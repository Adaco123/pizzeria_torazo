import ui from '../admin/Ui.module.css'
import styles from '../catalogo/Catalogo.module.css'
import { CampoContrasena } from './CampoContrasena.tsx'
import form from './Contrasena.module.css'
import { FuerzaContrasena } from './FuerzaContrasena.tsx'
import { MINIMO_CONTRASENA } from './seguridad.ts'
import { useContrasena, type PropsDeOtro } from './useContrasena.ts'

/** El administrador le pone una contraseña nueva a otro usuario (no pide la actual). */
export function ContrasenaDeOtro(props: PropsDeOtro) {
  const { nueva, setNueva, repetida, setRepetida, enviando, guardar } = useContrasena(props)

  return (
    <section className={styles.card}>
      <h2>Nueva contraseña para {props.nombre}</h2>
      <p className={styles.muted}>Dásela a la persona en privado; después puede cambiarla desde «Mi cuenta».</p>
      <form className={form.form} onSubmit={guardar}>
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
        <FuerzaContrasena nueva={nueva} repetida={repetida} />
        <div className={styles.acciones}>
          <button className={`${ui.btn} ${ui.primario}`} type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Restablecer contraseña'}
          </button>
          <button className={`${ui.btn} ${ui.secundario}`} type="button" disabled={enviando} onClick={props.onCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  )
}
