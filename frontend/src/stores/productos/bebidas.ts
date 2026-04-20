
import { defineStore } from 'pinia';
import api from '@/services/api';

interface Bebida {
    producto_id: number;
    nombre: string;
    stock: number | null;
    agotado: boolean;
}

interface ProductoStock {
    producto_id: number;
    nombre: string;
    stock: number;
}

export const useBebidasStore = defineStore('bebidas', {
    state: () => ({
        bebidas: [] as Bebida[],
        bebidaActual: null as ProductoStock | null,
        loading: false,
        error: null as string | null,
    }),

    getters: {
        bebidasAgotadas: (state) => state.bebidas.filter(b => b.agotado),
        bebidasDisponibles: (state) => state.bebidas.filter(b => !b.agotado),
    },

    actions: {
        
        async fetchBebidas() {
            this.loading = true;
            this.error = null;
            try {
                const res = await api.get('/api/v1.0/productos/stock/bebidas');
                this.bebidas = res.data.data;
            } catch (err: any) {
                this.error = err.response?.data?.message || 'Error al cargar bebidas';
            } finally {
                this.loading = false;
            }
        },

        
        async fetchStockBebida(productoId: number) {
            this.loading = true;
            this.error = null;
            try {
                const res = await api.get(`/api/v1.0/productos/${productoId}/stock`);
                this.bebidaActual = res.data;
                return res.data;
            } catch (err: any) {
                this.error = err.response?.data?.message || 'Error al cargar stock';
            } finally {
                this.loading = false;
            }
        },

        
        async agregarStock(productoId: number, cantidad: number) {
            this.loading = true;
            this.error = null;
            try {
                const res = await api.post(`/api/v1.0/productos/${productoId}/stock`, { cantidad });

                
                const index = this.bebidas.findIndex(b => b.producto_id === productoId);
                if (index !== -1) {
                    this.bebidas[index].stock = res.data.stock_actual;
                    this.bebidas[index].agotado = res.data.stock_actual === 0;
                }

                return res.data;
            } catch (err: any) {
                this.error = err.response?.data?.message || 'Error al agregar stock';
                throw err;
            } finally {
                this.loading = false;
            }
        },
    },
});