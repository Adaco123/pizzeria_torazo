import  api from "./api.ts"

export interface Usuario{
    id:     number
    nombre: string
    correo: string
    rol:    string
    activo: boolean
}
export const getPersonal = () =>
    api.get<Usuario[]>("/api/v1.0/usuarios")