import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

import HomeView from "../views/HomeView.vue";
import UserView from "../views/UserLogin.vue";
import panel_pizzero from "../views/pizzero/panel_pizzero.vue";


function redirectByRole(authStore: ReturnType<typeof useAuthStore>) {
  const role = authStore.user?.rol?.toLowerCase();
  if (role === "admin") {
    return { name: "adminDashboard" };
  }

  if (role === "cajero") {
    return { name: "cajeroVentas" };
  }

  if (role === "pizzero") {
    return { name: "panel_pizzero" };
  }

  return { name: "home" };
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: { requiresAuth: false }
    },
    {
      path: "/login",
      name: "login",
      component: UserView,
      meta: { requiresAuth: false }
    },
    
    {
      path: "/registrate",
      name: "register",
      component: UserView,
      meta: { requiresAuth: false }
    },
    {
      path: "/panel_pizzero",
      name: "panel_pizzero",
      component: ()=> import("../views/pizzero/panel_pizzero.vue"),
      meta: { requiresAuth: true, rol:"Pizzero" }
    },
    
    {
      path: "/cajero",
      name: "cajeroVentas",
      component: () => import("../views/cajero/panel_cajero.vue"),
      meta: { requiresAuth: true, rol: "Cajero" }
    },

    
    {
      path: "/admin",
      name: "adminDashboard",
      component: () => import("../views/admin/PanelAdmin.vue"),
      meta: { requiresAuth: true, rol: "Admin" }
    }
  ]
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.user) {
    await authStore.init();
  }

  const requiresAuth = to.meta.requiresAuth;
  const requiredRole = (to.meta.rol as string | undefined)?.toLowerCase();

  if ((to.name === "login" || to.name === "register") && authStore.isAuthenticated) {
    return next(redirectByRole(authStore));
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    return next({ name: "login" });
  }

  if (requiredRole && authStore.user) {
    if (authStore.user.rol !== requiredRole) {
      console.warn("Acceso denegado");
      return next(redirectByRole(authStore));
    }
  }

  next();
});

export default router;