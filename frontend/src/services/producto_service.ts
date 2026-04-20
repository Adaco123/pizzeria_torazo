import api from "./api";
export interface Categoria {
  id:     number;
  nombre: string;
  activo: boolean;
}
export interface CategoriaPayload {
  nombre:  string;
  activo?: boolean;
}
export interface Producto {
  id:           number;
  nombre:       string;
  descripcion?: string;
  precio_base:  number;
  activo:       boolean;
  categoria_id: number;
  stock?:       number | null;
  created_at:   string;
  updated_at:   string;
}
export interface ProductoPayload {
  nombre:       string;
  precio_base:  number;
  categoria_id: number;
  descripcion?: string;
  activo?:      boolean;
}

export interface ProductoTamano {
  tamano_id: number;
  tamano:    string;
  precio:    number;
}

export interface ProductoTamanoPayload {
  tamano_id: number;
  precio:    number;
}

export interface ProductoStock {
  producto_id: number;
  nombre:      string;
  stock:       number;
}

export interface ProductoStockItem extends ProductoStock {
  agotado: boolean;
}



export const getCategorias = () =>
  api.get<{ message: string; data: Categoria[] }>("/api/v1.0/categorias/");

export const getCategoria = (id: number) =>
  api.get<Categoria>(`/api/v1.0/categorias/${id}`);

export const createCategoria = (data: CategoriaPayload) =>
  api.post<Categoria>("/api/v1.0/categorias/", data);

export const updateCategoria = (id: number, data: Partial<CategoriaPayload>) =>
  api.put<Categoria>(`/api/v1.0/categorias/${id}`, data);

export const deleteCategoria = (id: number) =>
  api.delete(`/api/v1.0/categorias/${id}`);

export const toggleActiveCategoria = (id: number) =>
  api.patch<Categoria>(`/api/v1.0/categorias/${id}/toggle-active`);



export const getProductos = () =>
  api.get<Producto[]>("/api/v1.0/productos/");

export const getProducto = (id: number) =>
  api.get<Producto>(`/api/v1.0/productos/${id}`);

export const createProducto = (data: ProductoPayload) =>
  api.post<Producto>("/api/v1.0/productos/", data);

export const updateProducto = (id: number, data: Partial<ProductoPayload>) =>
  api.put<Producto>(`/api/v1.0/productos/${id}`, data);

export const deleteProducto = (id: number) =>
  api.delete(`/api/v1.0/productos/${id}`);

export const toggleActiveProducto = (id: number) =>
  api.patch<Producto>(`/api/v1.0/productos/${id}/toggle-active`);

export const getProductosByCategoria = (categoriaId: number) =>
  api.get<Producto[]>(`/api/v1.0/categorias/${categoriaId}/productos`);



export const getProductoTamanos = (productoId: number) =>
  api.get<ProductoTamano[]>(`/api/v1.0/productos/${productoId}/tamanos`);

export const addTamanoToProducto = (productoId: number, data: ProductoTamanoPayload) =>
  api.post<ProductoTamano>(`/api/v1.0/productos/${productoId}/tamanos`, data);

export const removeTamanoFromProducto = (productoId: number, tamanoId: number) =>
  api.delete(`/api/v1.0/productos/${productoId}/tamanos/${tamanoId}`);



export const getProductoStock = (productoId: number) =>
  api.get<ProductoStock>(`/api/v1.0/productos/${productoId}/stock`);

export const addStockToProducto = (productoId: number, cantidad: number) =>
  api.post<{ message: string; stock_actual: number }>(
    `/api/v1.0/productos/${productoId}/stock`,
    { cantidad }
  );

export const getStockBebidas = () =>
  api.get<{ data: ProductoStockItem[] }>("/api/v1.0/productos/stock/bebidas");