import { KeyRound, Pencil, Plus, Power, Users as IconoUsuarios } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { authApi } from '../../apis/auth.ts'
import type { RolInfo, UsuarioAdmin } from '../../apis/auth.ts'
import { useAuth } from '../../auth/auth-context.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
import { Acciones, Buscador, BotonIcono, Cabeza, EstadoPildora, FiltroEstadoBarra, Vacio } from '../admin/ui.tsx'
import { coincideEstado } from '../admin/filtros.ts'
import type { FiltroEstado } from '../admin/filtros.ts'
import ui from '../admin/Ui.module.css'
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
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')

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

  const texto = busqueda.trim().toLowerCase()
  const visibles = (usuarios ?? []).filter(
    (u) => coincideEstado(filtro, u.activo) && `${u.nombre} ${u.correo}`.toLowerCase().includes(texto),
  )

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
        <Cabeza icono={IconoUsuarios} titulo="Usuarios" cuenta={usuarios?.length}>
          <button className={`${ui.btn} ${ui.primario}`} type="button" onClick={() => setPanel({ tipo: 'nuevo' })}>
            <Plus size={16} aria-hidden="true" /> Nuevo usuario
          </button>
        </Cabeza>

        {!usuarios && !error && <p className={styles.muted}>Cargando usuarios…</p>}
        {usuarios && (
          <>
            <div className={ui.herramientas}>
              <Buscador valor={busqueda} onChange={setBusqueda} etiqueta="Buscar usuario" />
              <FiltroEstadoBarra valor={filtro} onChange={setFiltro} items={usuarios} />
            </div>
            {visibles.length === 0 ? (
              <Vacio icono={IconoUsuarios} titulo="No hay usuarios que coincidan" detalle="Prueba con otro nombre o quita el filtro." />
            ) : (
              <div className={ui.tw}>
                <table className={ui.tabla}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>
                        <span className={ui.soloLector}>Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((u) => {
                      const esUnoMismo = u.id === sesion?.id
                      return (
                        <tr key={u.id} className={u.activo ? undefined : ui.inactiva}>
                          <td>
                            <b>{u.nombre}</b>
                            {esUnoMismo && <span className={ui.cuenta}> tú</span>}
                          </td>
                          <td>{u.correo}</td>
                          <td>{u.rol ?? '—'}</td>
                          <td>
                            <EstadoPildora activo={u.activo} />
                          </td>
                          <td className={ui.acciones}>
                            <Acciones>
                              <BotonIcono icono={Pencil} titulo={`Editar a ${u.nombre}`} onClick={() => setPanel({ tipo: 'editar', usuario: u })} />
                              {!esUnoMismo && (
                                <BotonIcono
                                  icono={KeyRound}
                                  titulo={`Restablecer la contraseña de ${u.nombre}`}
                                  onClick={() => setPanel({ tipo: 'contrasena', usuario: u })}
                                />
                              )}
                              {!esUnoMismo && (
                                <BotonIcono
                                  icono={Power}
                                  titulo={u.activo ? `Desactivar a ${u.nombre}` : `Activar a ${u.nombre}`}
                                  tono={u.activo ? 'ok' : 'off'}
                                  disabled={ocupadoId === u.id}
                                  onClick={() => void cambiarActivo(u)}
                                />
                              )}
                            </Acciones>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
