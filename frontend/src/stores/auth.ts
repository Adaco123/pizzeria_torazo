import { defineStore } from "pinia";
import api from "../services/api";
import axios from "axios";

type Rol = "Admin" | "Cajero" | "Pizzero";

interface Usuario {
  id:     number;
  correo: string;
  rol:    Rol;
  nombre: string;
}

interface LoginResponse {
  access_token: string;
  rol:          Rol;
  nombre:       string;
  id:           number;
}

interface MeResponse {
  user: {
    id:     number;
    correo: string;
    rol:    Rol;
    nombre: string;
  };
}

interface RegisterPayload {
  nombre:  string;
  correo:  string;
  cedula:  string;
  contra:  string;
  rol_id:  number;
  codigo?: string | null;
}

interface ActionResult {
  success:  boolean;
  message?: string;
}

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as any)?.detail  ??
           (err.response?.data as any)?.error   ??
           (err.response?.data as any)?.message ??
           err.message ?? "";
  }
  if (err instanceof Error) return err.message;
  return String(err ?? "");
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user:  null as Usuario | null,
    token: (localStorage.getItem("token") || null) as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    esAdmin:         (state) => state.user?.rol?.toLowerCase() === "admin",
    esCajero:        (state) => state.user?.rol?.toLowerCase() === "cajero",
    esPizzero:       (state) => state.user?.rol?.toLowerCase() === "pizzero",
  },

  actions: {
    async init() {
      if (this.token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
        if (!this.user) {
          await this.fetchUser();
        }
      }
    },

    async fetchUser() {
      try {
        const res = await api.get<MeResponse>("/api/v1.0/me");
        if (res.data?.user) {
          this.setUser({
            id:     res.data.user.id,
            correo: res.data.user.correo,
            rol:    res.data.user.rol.toLowerCase() as Rol,
            nombre: res.data.user.nombre,
          });
        }
      } catch (err: unknown) {
        console.error('fetchUser failed', err);
        this.logout();
      }
    },

    setToken(token: string | null) {
      this.token = token;
      if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        localStorage.setItem("token", token);
      } else {
        delete api.defaults.headers.common["Authorization"];
        localStorage.removeItem("token");
      }
    },

    setUser(user: Usuario | null) {
      this.user = user;
    },

    async login(correo: string, contra: string): Promise<ActionResult> {
      try {
        const res = await api.post<LoginResponse>("/api/v1.0/login/", { correo, contra });

        if (res.status === 200 && res.data) {
          this.setToken(res.data.access_token);
          this.setUser({
            id:     res.data.id,
            correo,
            rol:    res.data.rol.toLowerCase() as Rol,
            nombre: res.data.nombre,
          });
          console.info('[Auth] login successful for', correo, 'role', res.data.rol);
          return { success: true };
        }

        return { success: false, message: "Error en login" };
      } catch (err: unknown) {
        console.error('[Auth] login failed', err);
        return {
          success: false,
          message: getErrorMessage(err) || "Error de conexión",
        };
      }
    },

    async register(payload: RegisterPayload): Promise<ActionResult> {
      try {
        const res = await api.post("/api/v1.0/registrar/", {
          nombre: payload.nombre,
          correo: payload.correo,
          cedula: payload.cedula,
          contra: payload.contra,
          rol_id: payload.rol_id,
          codigo: payload.codigo || null,
        });

        if (res.status === 200 || res.status === 201) {
          return { success: true };
        }

        return { success: false, message: "Error inesperado al registrar" };
      } catch (err: unknown) {
        return {
          success: false,
          message: getErrorMessage(err) || "Error al registrar usuario",
        };
      }
    },

    logout() {
      this.setUser(null);
      this.setToken(null);
    },
  },
});