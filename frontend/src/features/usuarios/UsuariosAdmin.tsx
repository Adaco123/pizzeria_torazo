import { useCallback, useEffect, useState } from 'react'
import { authApi } from '../../api.ts'
import type { RolInfo, UsuarioAdmin } from '../../api.ts'
import { useAuth } from '../../auth/auth-context.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
import styles from '../catalogo/Catalogo.module.css'
import { ContrasenaForm } from './ContrasenaForm.tsx'
import { FormularioUsuario } from './FormularioUsuario.tsx'

type Panel =
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; usuario: UsuarioAdmin }
  | { tipo: 'contrasena'; usuario: UsuarioAdmin }
  | null

export function UsuariosAdmin() {
  const { sesion } = useAuth()
  const toast = useToast()
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null)
  const [roles, setRoles] = useState<RolInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const opts = { signal: controller.signal }
    Promise.all([authApi.listarUsuariosAdmin(opts), authApi.listarRoles(opts)])
      .then(([lista, listaRoles]) => {
        setUsuarios(lista)
        setRoles(listaRoles)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
    return () => controller.abort()
  }, [version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  function terminar() {
    setPanel(null)
    recargar()
  }

  async function cambiarActivo(usuario: UsuarioAdmin) {
    const desactivar = usuario.activo
    if (
      desactivar &&
      !window.confirm(`¿Desactivar a ${usuario.nombre}? Se le cierra la sesión y ya no podrá entrar.`)
    ) {
      return
    }
    setOcupadoId(usuario.id)
    try {
      await authApi.editarUsuario(usuario.id, { activo: !desactivar })
      toast.exito(desactivar ? `${usuario.nombre} fue desactivado` : `${usuario.nombre} fue activado`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
      recargar()
    }
  }

  return (
    <div className={styles.page}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {panel?.tipo === 'nuevo' && (
        <FormularioUsuario roles={roles} onListo={terminar} onCancelar={() => setPanel(null)} />
      )}
      {panel?.tipo === 'editar' && (
        <FormularioUsuario
          key={panel.usuario.id}
          roles={roles}
          usuario={panel.usuario}
          esUnoMismo={panel.usuario.id === sesion?.id}
          onListo={terminar}
          onCancelar={() => setPanel(null)}
        />
      )}
      {panel?.tipo === 'contrasena' && (
        <ContrasenaForm
          key={panel.usuario.id}
          modo="otro"
          usuarioId={panel.usuario.id}
          nombre={panel.usuario.nombre}
          onListo={() => setPanel(null)}
          onCancelar={() => setPanel(null)}
        />
      )}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Usuarios</h2>
          <button className={styles.primary} type="button" onClick={() => setPanel({ tipo: 'nuevo' })}>
            Nuevo usuario
          </button>
        </div>

        {!usuarios && !error && <p className={styles.muted}>Cargando usuarios…</p>}
        {usuarios && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const esUnoMismo = u.id === sesion?.id
                  return (
                    <tr key={u.id} className={u.activo ? undefined : styles.inactiva}>
                      <td>
                        {u.nombre}
                        {esUnoMismo && ' (tú)'}
                      </td>
                      <td>{u.correo}</td>
                      <td>{u.rol ?? '—'}</td>
                      <td>
                        <span className={`${styles.badge} ${u.activo ? styles.badgeOn : styles.badgeOff}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.acciones}>
                          <button className={styles.link} type="button" onClick={() => setPanel({ tipo: 'editar', usuario: u })}>
                            Editar
                          </button>
                          {!esUnoMismo && (
                            <button
                              className={styles.link}
                              type="button"
                              onClick={() => setPanel({ tipo: 'contrasena', usuario: u })}
                            >
                              Contraseña
                            </button>
                          )}
                          {!esUnoMismo && (
                            <button
                              className={styles.link}
                              type="button"
                              disabled={ocupadoId === u.id}
                              onClick={() => void cambiarActivo(u)}
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
