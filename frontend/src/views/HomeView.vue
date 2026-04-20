<template>

  <div class="container">

    <div class="navbar">
      <div class="logo-wrapper">
        <div class="logo">
          <router-link to="/" class="logo-link">
            <span>EL</span> TORAZO
          </router-link>
        </div>
      </div>
      <div class="nav-buttons">
        <router-link to="/login" class="nav-btn login">
          <i class="fas fa-sign-in-alt"></i> INICIAR SESIÓN
        </router-link>
      </div>
    </div>


    <div class="header">
      <div class="main-logo">
        <span>EL</span> TORAZO
      </div>
      <div class="subtitle">ÁREA EXCLUSIVA EMPLEADOS</div>
    </div>


    <div class="hero">
      <h1>BIENVENIDOS <span>AL EQUIPO</span></h1>
      <p>Plataforma digital exclusiva para los empleados de Pizzería El Torazo. 
         Accede a todas las herramientas y recursos que necesitas para tu desarrollo laboral.</p>
    </div>


    <div class="separator">
      <div class="separator-line"></div>
    </div>

    <div class="footer">
      <div class="footer-logo">
        <span>EL</span> TORAZO
      </div>
      <div class="footer-text">
        © {{ currentYear }} Pizzería El Torazo - Todos los derechos reservados
      </div>
      <div class="footer-text" style="margin-top: 10px; color: #666;">
        Área exclusiva para empleados
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { computed } from 'vue';

interface InfoCard {
  id: number;
  icon: string;
  title: string;
  description: string;
}

interface Stat {
  id: number;
  number: string;
  label: string;
}


const emit = defineEmits<{
  (e: 'showLogin', tab: 'login'): void;
}>();

const stats = computed<Stat[]>(() => [
  { id: 1, number: '150+', label: 'EMPLEADOS' },
  { id: 2, number: '15',   label: 'AÑOS DE HISTORIA' },
  { id: 3, number: '24/7', label: 'DISPONIBILIDAD' },
  { id: 4, number: '100%', label: 'COMPROMISO' }
]);


const currentYear = computed<number>(() => new Date().getFullYear());
</script>

<style scoped>

.container {
  width: 100%;
  max-width: 1200px;
  padding: 20px 20px 40px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  margin-bottom: 40px;
  border-bottom: 1px solid rgba(255, 0, 0, 0.3);
}

.logo-wrapper {
  display: inline-block;
  position: relative;
}

.logo {
  font-size: 32px;
  font-weight: 800;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 2px;
  position: relative;
  z-index: 2;
  text-shadow: 
    2px 2px 0 #ff0000,
    4px 4px 0 rgba(0,0,0,0.5);
}

.logo-link {
  color: inherit;
  text-decoration: none;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
}

.logo span {
  color: #ff0000;
  text-shadow: 
    2px 2px 0 #ffffff,
    4px 4px 0 rgba(0,0,0,0.5);
}

.nav-buttons {
  display: flex;
  gap: 20px;
}

.nav-btn {
  padding: 12px 28px;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Montserrat', sans-serif;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 2px solid transparent;
  text-decoration: none;
}

.nav-btn i {
  font-size: 16px;
}

.nav-btn.login {
  background: transparent;
  color: #ffffff;
  border: 2px solid #ff0000;
}

.nav-btn.login:hover {
  background: #ff0000;
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 0, 0, 0.3);
}

/* Header styles */
.header {
  text-align: center;
  margin-bottom: 60px;
  position: relative;
}

.main-logo {
  font-size: 72px;
  font-weight: 800;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 4px;
  position: relative;
  z-index: 2;
  text-shadow: 
    4px 4px 0 #ff0000,
    8px 8px 0 rgba(0,0,0,0.5);
  margin-bottom: 20px;
}

.main-logo span {
  color: #ff0000;
  text-shadow: 
    4px 4px 0 #ffffff,
    8px 8px 0 rgba(0,0,0,0.5);
}

.subtitle {
  font-size: 22px;
  color: #cccccc;
  letter-spacing: 5px;
  text-transform: uppercase;
  position: relative;
  display: inline-block;
  padding: 0 20px;
  font-weight: 600;
}

.subtitle::before,
.subtitle::after {
  content: "•";
  color: #ff0000;
  margin: 0 15px;
  font-size: 24px;
}

.hero {
  text-align: center;
  margin-bottom: 80px;
  position: relative;
  background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7));
  padding: 60px 40px;
  border-radius: 20px;
  border: 1px solid rgba(255, 0, 0, 0.3);
}

.hero h1 {
  font-size: 48px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 3px;
}

.hero h1 span {
  color: #ff0000;
  border-bottom: 3px solid #ff0000;
  padding-bottom: 5px;
}

.hero p {
  font-size: 20px;
  color: #e0e0e0;
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.8;
  font-weight: 300;
}

.separator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 60px 0;
}

.separator-line {
  height: 3px;
  width: 150px;
  background: linear-gradient(to right, transparent, #ff0000, transparent);
}

.info-section {
  margin-top: 60px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.info-card {
  background: linear-gradient(145deg, #111111 0%, #1a1a1a 100%);
  padding: 45px 30px;
  border-radius: 15px;
  border: 1px solid #333333;
  transition: all 0.4s ease;
  position: relative;
  overflow: hidden;
  text-align: center;
}

.info-card:hover {
  border-color: #ff0000;
  transform: translateY(-15px);
  box-shadow: 0 20px 40px rgba(255, 0, 0, 0.2);
  background: linear-gradient(145deg, #1a1a1a 0%, #222222 100%);
}

.info-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 0%, rgba(255, 0, 0, 0.1), transparent 70%);
  opacity: 0;
  transition: opacity 0.4s;
}

.info-card:hover::before {
  opacity: 1;
}

.info-card::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: #ff0000;
  transform: scaleX(0);
  transition: transform 0.4s;
}

.info-card:hover::after {
  transform: scaleX(1);
}

.info-card i {
  font-size: 55px;
  color: #ff0000;
  margin-bottom: 25px;
  transition: transform 0.4s;
}

.info-card:hover i {
  transform: scale(1.2);
}

.info-card h3 {
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.info-card p {
  color: #cccccc;
  font-size: 16px;
  line-height: 1.7;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  margin-top: 80px;
  padding: 40px 0;
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 42px;
  font-weight: 800;
  color: #ff0000;
  margin-bottom: 10px;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.5);
}

.stat-label {
  font-size: 16px;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 500;
}


.cta-section {
  text-align: center;
  margin: 80px 0;
  padding: 60px;
  background: linear-gradient(145deg, #0a0a0a 0%, #111111 100%);
  border-radius: 20px;
  border: 1px solid #ff0000;
  position: relative;
  overflow: hidden;
}

.cta-section::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,0,0,0.1) 0%, transparent 70%);
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.cta-content {
  position: relative;
  z-index: 2;
}

.cta-title {
  font-size: 36px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 3px;
}

.cta-title span {
  color: #ff0000;
}

.cta-text {
  font-size: 18px;
  color: #cccccc;
  margin-bottom: 30px;
}

.cta-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.cta-btn {
  padding: 16px 40px;
  border-radius: 50px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-family: 'Montserrat', sans-serif;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 2px solid transparent;
}

.cta-btn.login {
  background: transparent;
  color: #ffffff;
  border: 2px solid #ff0000;
}

.cta-btn.login:hover {
  background: #ff0000;
  color: #ffffff;
  transform: scale(1.05);
}

.footer {
  margin-top: 100px;
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid #333;
}

.footer-logo {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 20px;
}

.footer-logo span {
  color: #ff0000;
}

.footer-text {
  color: #999;
  font-size: 14px;
  letter-spacing: 2px;
}


@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: 20px;
  }

  .nav-buttons {
    width: 100%;
    justify-content: center;
  }

  .container {
    padding: 20px;
  }
  
  .main-logo {
    font-size: 48px;
    text-shadow: 
      3px 3px 0 #ff0000,
      6px 6px 0 rgba(0,0,0,0.5);
  }
  
  .hero h1 {
    font-size: 36px;
  }

  .hero p {
    font-size: 18px;
    padding: 0 20px;
  }
  
  .info-section {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }

  .cta-section {
    padding: 40px 20px;
  }

  .cta-title {
    font-size: 28px;
  }

  .cta-buttons {
    flex-direction: column;
    align-items: center;
  }

  .cta-btn {
    width: 100%;
    justify-content: center;
  }
  
  .info-card {
    padding: 35px 25px;
  }
}

@media (max-width: 480px) {
  .main-logo {
    font-size: 36px;
    text-shadow: 
      2px 2px 0 #ff0000,
      4px 4px 0 rgba(0,0,0,0.5);
  }
  
  .subtitle {
    font-size: 16px;
  }

  .hero h1 {
    font-size: 28px;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }

  .nav-buttons {
    flex-direction: column;
    gap: 10px;
  }

  .nav-btn {
    width: 100%;
    justify-content: center;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero, .info-card, .stat-item, .cta-section {
  animation: fadeInUp 0.8s ease-out;
}
</style>