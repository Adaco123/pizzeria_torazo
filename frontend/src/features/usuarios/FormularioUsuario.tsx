import { useState, type SubmitEvent } from 'react'
import { authApi } from '../../api.ts'
import type { RolInfo, UsuarioAdmin } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import styles from '../catalogo/Catalogo.module.css'

interface Props {
  roles: RolInfo[]
  /** Si viene, se edita ese usuario; si no, se crea uno nuevo. */
  usuario?: UsuarioAdmin
  /** Para no dejarse a sí mismo sin permisos de administración ni desactivarse. */
  esUnoMismo?: boolean
  onListo: () => void
  onCancelar: () => void
}

export function FormularioUsuario({ roles, usuario, esUnoMismo = false, onListo, onCancelar }: Props) {
  const toast = useToast()
  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [correo, setCorreo] = useState(usuario?.correo ?? '')
  const [cedula, setCedula] = useState(usuario?.cedula ?? '')
  const [codigo, setCodigo] = useState(usuario?.codigo ?? '')
  const [rolId, setRolId] = useState<number | ''>(usuario?.rol_id ?? roles.find((r) => r.nombre === 'Cajero')?.id ?? '')
  const [contra, setContra] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function guardar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (rolId === '') {
      toast.error('Elige un rol')
      return
    }
    setEnviando(true)
    try {
      if (usuario) {
        await authApi.editarUsuario(usuario.id, {
          nombre: nombre.trim(),
          correo: correo.trim(),
          cedula: cedula.trim(),
          codigo: codigo.trim(),
          rol_id: rolId,
        })
        toast.exito(`${nombre.trim()} actualizado`)
      } else {
        await authApi.registrar({
          nombre: nombre.trim(),
          correo: correo.trim(),
          cedula: cedula.trim(),
          codigo: codigo.trim(),
          rol_id: rolId,
          contra,
        })
        toast.exito(`${nombre.trim()} fue creado`)
      }
      onListo()
    } catch (e) {
      toast.error(e)
      setEnviando(false)
    }
  }

  return (
    <section className={styles.card}>
      <h2>{usuario ? `Editar a ${usuario.nombre}` : 'Nuevo usuario'}</h2>
      <form className={styles.form} onSubmit={guardar}>
        <label className={styles.field}>
          <span>Nombre completo</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="off" />
        </label>
        <label className={styles.field}>
          <span>Correo (con el que inicia sesión)</span>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="off" />
        </label>
        <label className={styles.field}>
          <span>Cédula</span>
          <input value={cedula} onChange={(e) => setCedula(e.target.value)} required autoComplete="off" />
        </label>
        <label className={styles.field}>
          <span>Código (5 a 10 dígitos)</span>
          <input
            inputMode="numeric"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label className={styles.field}>
          <span>Rol</span>
          <select value={rolId} onChange={(e) => setRolId(e.target.value === '' ? '' : Number(e.target.value))} required>
            <option value="">Elegir…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
          {esUnoMismo && <small>Es tu cuenta: si cambias tu rol dejarás de ser administrador.</small>}
        </label>
        {!usuario && (
          <label className={styles.field}>
            <span>Contraseña (mínimo 6 caracteres)</span>
            <input
              type="password"
              value={contra}
              onChange={(e) => setContra(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
        )}
        <button className={styles.primary} type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : usuario ? 'Guardar cambios' : 'Crear usuario'}
        </button>
        <button className={styles.secondary} type="button" disabled={enviando} onClick={onCancelar}>
          Cancelar
        </button>
      </form>
    </section>
  )
}
