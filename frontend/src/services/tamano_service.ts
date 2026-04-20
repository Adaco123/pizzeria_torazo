import api from "./api";

export interface Tamano {
  id:     number;
  nombre: string;
}

export interface TamanoPayload {
  nombre: string;
}

export const getTamanos = () =>
  api.get<Tamano[]>("/api/v1.0/tamanos/");

export const getTamano = (id: number) =>
  api.get<Tamano>(`/api/v1.0/tamanos/${id}`);

export const createTamano = (data: TamanoPayload) =>
  api.post<Tamano>("/api/v1.0/tamanos/", data);

export const updateTamano = (id: number, data: Partial<TamanoPayload>) =>
  api.put<Tamano>(`/api/v1.0/tamanos/${id}`, data);

export const deleteTamano = (id: number) =>
  api.delete(`/api/v1.0/tamanos/${id}`);