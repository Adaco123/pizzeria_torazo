import api from "./api";



export interface Ingrediente {
  id:           number;
  nombre:       string;
  precio_extra: number;
  activo:       boolean;
}

export interface IngredientePayload {
  nombre:       string;
  precio_extra?: number;
  activo?:      boolean;
}

export interface IngredienteTamano {
  ingrediente_id: number;
  tamano_id:      number;
  precio_extra:   number;
}

export interface IngredienteTamanoPayload {
  ingrediente_id: number;
  tamano_id:      number;
  precio_extra:   number;
}

export interface ProductoIngrediente {
  producto_id:    number;
  ingrediente_id: number;
}

export interface ProductoIngredientePayload {
  ingrediente_id: number;
}



export const getIngredientes = () =>
  api.get<Ingrediente[]>("/api/v1.0/ingredientes/");

export const getIngrediente = (id: number) =>
  api.get<Ingrediente>(`/api/v1.0/ingredientes/${id}`);

export const createIngrediente = (data: IngredientePayload) =>
  api.post<Ingrediente>("/api/v1.0/ingredientes/", data);

export const updateIngrediente = (id: number, data: Partial<IngredientePayload>) =>
  api.put<Ingrediente>(`/api/v1.0/ingredientes/${id}`, data);

export const deleteIngrediente = (id: number) =>
  api.delete(`/api/v1.0/ingredientes/${id}`);



export const getIngredientesTamanos = () =>
  api.get<IngredienteTamano[]>("/api/v1.0/ingredientes/tamanos/");

export const getIngredienteTamano = (ingredienteId: number, tamanoId: number) =>
  api.get<IngredienteTamano>(`/api/v1.0/ingredientes/${ingredienteId}/tamanos/${tamanoId}`);

export const createIngredienteTamano = (data: IngredienteTamanoPayload) =>
  api.post<IngredienteTamano>("/api/v1.0/ingredientes/tamanos/", data);

export const updateIngredienteTamano = (ingredienteId: number, tamanoId: number, precio_extra: number) =>
  api.put<IngredienteTamano>(`/api/v1.0/ingredientes/${ingredienteId}/tamanos/${tamanoId}`, { precio_extra });

export const deleteIngredienteTamano = (ingredienteId: number, tamanoId: number) =>
  api.delete(`/api/v1.0/ingredientes/${ingredienteId}/tamanos/${tamanoId}`);



export const getProductoIngredientes = (productoId: number) =>
  api.get<ProductoIngrediente[]>(`/api/v1.0/productos/${productoId}/ingredientes`);

export const addIngredienteToProducto = (productoId: number, data: ProductoIngredientePayload) =>
  api.post<ProductoIngrediente>(`/api/v1.0/productos/${productoId}/ingredientes`, data);

export const removeIngredienteFromProducto = (productoId: number, ingredienteId: number) =>
  api.delete(`/api/v1.0/productos/${productoId}/ingredientes/${ingredienteId}`);