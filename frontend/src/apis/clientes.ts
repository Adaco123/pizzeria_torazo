import { request, requestData, type Opts } from '../api.ts'

export interface Cliente {
  id: number
  nombre: string
  telefono: string
  direccion: string
  nit: string
  correo: string | null
  created_at?: string
}

export interface ClienteCreate {
  nombre: string
  telefono: string
  direccion: string
  nit: string
  correo?: string | null
}

/** El NIT no se puede modificar. */
export type ClienteUpdate = Partial<Omit<ClienteCreate, 'nit'>>

export interface ClienteTopCompras {
  nombre: string
  num_compras: number
  total_gastado: number
}

export interface ClienteFrecuente {
  cliente_id: number
  cliente: string
  telefono: string | null
  pedidos: number
  total: number
  /** Fecha y hora (ISO) del último cobro dentro del periodo. */
  ultima_compra: string | null
}

export interface HistorialCliente {
  cliente: { id: number; nombre: string; telefono: string }
  num_pedidos: number
  total_gastado: number
  ultima_compra: string | null
  pedidos: {
    id: number
    ficha: number | null
    fecha: string
    estado: string
    tipo_entrega: string | null
    total: number
    resumen: string
  }[]
}

export interface ResultadoRepetir {
  pedido_origen: number
  agregados: number
  /** Lo que ya no se pudo repetir (agotado, sin stock, fuera del menú). */
  omitidos: { nombre: string; motivo: string }[]
}

export const clientesApi = {
  historial(id: number, opts: Opts = {}): Promise<HistorialCliente> {
    return requestData<HistorialCliente>(`/api/v1.0/clientes/${id}/historial`, opts)
  },

  /** Agrega al borrador lo mismo que el cliente pidió la última vez, con los precios de hoy. */
  repetirUltimo(id: number, pedidoId: number): Promise<ResultadoRepetir> {
    return requestData<ResultadoRepetir>(`/api/v1.0/clientes/${id}/repetir-ultimo`, {
      method: 'POST',
      body: { pedido_id: pedidoId },
    })
  },

  listar(opts: Opts = {}): Promise<Cliente[]> {
    return request<Cliente[]>('/api/v1.0/clientes/', opts)
  },

  obtener(id: number, opts: Opts = {}): Promise<Cliente> {
    return request<Cliente>(`/api/v1.0/clientes/${id}`, opts)
  },

  async crear(data: ClienteCreate): Promise<Cliente> {
    const response = await request<{ message: string; cliente: Cliente }>('/api/v1.0/clientes/', {
      method: 'POST',
      body: data,
    })
    return response.cliente
  },

  async actualizar(id: number, data: ClienteUpdate): Promise<Cliente> {
    const response = await request<{ message: string; cliente: Cliente }>(
      `/api/v1.0/clientes/${id}`,
      { method: 'PUT', body: data },
    )
    return response.cliente
  },

  async eliminar(id: number): Promise<void> {
    await request(`/api/v1.0/clientes/${id}`, { method: 'DELETE' })
  },

  /** Solo administradores. */
  topCompras(opts: Opts = {}): Promise<ClienteTopCompras[]> {
    return request<ClienteTopCompras[]>('/api/v1.0/clientes/top-compras', opts)
  },
}
