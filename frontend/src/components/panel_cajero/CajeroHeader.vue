<template>
  <div class="header">
    <div class="logo-area">
      <div class="logo"><span>EL</span> TORAZO</div>
      <div class="user-info">
        <i class="fas fa-user-circle"></i>
        <div class="user-details">
          <div class="user-name">{{ nombre }}</div>
          <div class="user-role">{{ rol }}</div>
        </div>
        <button
          class="turno-btn"
          :class="{ 'turno-activo': turnoActivo }"
          @click="$emit('toggle-turno')"
          :disabled="loading"
        >
          <i :class="['fas', turnoActivo ? 'fa-stop' : 'fa-play']"></i>
          {{ turnoActivo ? 'CERRAR TURNO' : 'INICIAR TURNO' }}
        </button>
      </div>
    </div>
    <button class="logout-btn" @click="$emit('logout')">
      <i class="fas fa-sign-out-alt"></i> CERRAR SESIÓN
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  nombre:      string | undefined
  rol:         string | undefined
  turnoActivo: boolean
  loading:     boolean
}>()

defineEmits<{
  (e: 'toggle-turno'): void
  (e: 'logout'):       void
}>()
</script>

<style scoped>
.header {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 30px;
  flex-wrap: wrap; gap: 20px;
}

.logo-area { display: flex; align-items: center; gap: 20px; }

.logo {
  font-size: 32px; font-weight: 800; color: #ffffff;
  text-transform: uppercase; letter-spacing: 2px;
  text-shadow: 2px 2px 0 #ff0000, 4px 4px 0 rgba(0,0,0,0.5);
}
.logo span {
  color: #ff0000;
  text-shadow: 2px 2px 0 #ffffff, 4px 4px 0 rgba(0,0,0,0.5);
}

.user-info {
  background: #111111; padding: 10px 25px;
  border-radius: 50px; border: 1px solid #ff0000;
  display: flex; align-items: center; gap: 15px;
}
.user-info i  { color: #ff0000; font-size: 20px; }
.user-name    { font-weight: 700; color: #ffffff; }
.user-role    { font-size: 12px; color: #ff0000; text-transform: uppercase; }

.turno-btn {
  background: #ff0000; border: none; color: #ffffff;
  padding: 8px 15px; border-radius: 25px; cursor: pointer;
  font-weight: 600; font-size: 12px;
  display: flex; align-items: center; gap: 5px;
  transition: all 0.3s; text-transform: uppercase;
  letter-spacing: 1px; margin-left: 10px;
}
.turno-btn.turno-activo { background: #dc3545; box-shadow: 0 0 10px rgba(220,53,69,0.5); }
.turno-btn:hover:not(:disabled) { background: #cc0000; transform: translateY(-2px); }
.turno-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.logout-btn {
  background: transparent; border: 2px solid #ff0000;
  color: #ffffff; padding: 10px 20px; border-radius: 50px;
  cursor: pointer; font-weight: 600; transition: all 0.3s;
}
.logout-btn:hover { background: #ff0000; color: #000000; }

@media (max-width: 768px) {
  .header, .logo-area { flex-direction: column; text-align: center; }
}
</style>