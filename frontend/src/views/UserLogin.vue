<template>
  <div id="app">
    <div class="container">
      
      <div class="header">
        <div class="logo-wrapper">
          <div class="logo">
            <router-link to="/" class="logo">
              <span>EL</span> TORAZO
            </router-link>
          </div>
        </div>
        <div class="subtitle">ÁREA EXCLUSIVA EMPLEADOS</div>
        <div class="separator">
          <div class="separator-line"></div>
        </div>
      </div>

      
      <div class="access-panel">
        <div class="tabs">
          <div class="tab active">
            <i class="fas fa-sign-in-alt"></i> INGRESAR
          </div>
        </div>

        <div class="forms-container">
          
          <div class="form active">
            <h2>INICIAR SESIÓN</h2>

            <div v-if="loginError" class="error-banner">
              <i class="fas fa-exclamation-circle"></i> {{ loginError }}
            </div>

            <form @submit.prevent="handleLogin">
              
              <div class="input-group" :class="{ focused: loginForm.correoFocused }">
                <i class="fas fa-envelope"></i>
                <input
                  type="email"
                  v-model="loginForm.correo"
                  placeholder="Correo electrónico"
                  required
                  :disabled="loginLoading"
                  @focus="loginForm.correoFocused = true"
                  @blur="loginForm.correoFocused = false; validateField('correo')"
                  @input="clearFieldError('correo')"
                />
              </div>
              <span v-if="fieldErrors.correo" class="field-error">
                <i class="fas fa-exclamation-circle"></i> {{ fieldErrors.correo }}
              </span>

              
              <div class="input-group" :class="{ focused: loginForm.contraFocused }">
                <i class="fas fa-lock"></i>
                <input
                  type="password"
                  v-model="loginForm.contra"
                  placeholder="Contraseña"
                  required
                  :disabled="loginLoading"
                  @focus="loginForm.contraFocused = true"
                  @blur="loginForm.contraFocused = false; validateField('contra')"
                  @input="clearFieldError('contra')"
                />
              </div>
              <span v-if="fieldErrors.contra" class="field-error">
                <i class="fas fa-exclamation-circle"></i> {{ fieldErrors.contra }}
              </span>

              <button type="submit" class="btn" :disabled="loginLoading">
                <i :class="loginLoading ? 'fas fa-spinner fa-spin' : 'fas fa-sign-in-alt'"></i>
                {{ loginLoading ? 'ACCEDIENDO...' : 'ACCEDER' }}
              </button>
            </form>

            <div class="employee-badge">
              <i class="fas fa-id-badge"></i>
              <span>PERSONAL AUTORIZADO</span>
            </div>
            <div class="forgot-password">
              <a @click.prevent="handleForgotPassword">
                <i class="fas fa-question-circle"></i> ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>
        </div>
      </div>

      
      <div class="info-section">
        <div class="info-card" v-for="card in infoCards" :key="card.id">
          <i :class="card.icon"></i>
          <h3>{{ card.title }}</h3>
          <p>{{ card.description }}</p>
        </div>
      </div>
    </div>

    
    <div class="modal" :class="{ show: modals.error }">
      <div class="modal-content">
        <i class="fas fa-exclamation-circle"></i>
        <h3>ERROR</h3>
        <p>{{ errorMessage }}</p>
        <button class="modal-btn" @click="closeErrorModal">ACEPTAR</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()


const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const RE_PASS  = /^.{6,}$/


const loginLoading = ref(false)
const loginError   = ref('')

const loginForm = reactive({
  correo: '',
  contra: '',
  correoFocused: false,
  contraFocused: false
})

const fieldErrors = reactive({
  correo: '',
  contra: ''
})


const modals = reactive({ error: false })
const errorMessage = ref('')


const infoCards = ref([
  {
    id: 1,
    icon: 'fas fa-user-tie',
    title: 'ACCESO PRIVADO',
    description: 'Sistema exclusivo para colaboradores de Pizzería El Torazo.'
  },
  {
    id: 2,
    icon: 'fas fa-clock',
    title: 'DISPONIBILIDAD',
    description: 'Acceso 24/7 a turnos, nóminas, comunicados internos y beneficios laborales.'
  },
  {
    id: 3,
    icon: 'fas fa-headset',
    title: 'SOPORTE RH',
    description: '¿Problemas con tu acceso? Contacta a Recursos Humanos.'
  }
])


const validateField = (field: 'correo' | 'contra'): boolean => {
  if (field === 'correo') {
    if (!loginForm.correo) {
      fieldErrors.correo = 'El correo es obligatorio'
      return false
    }
    if (!RE_EMAIL.test(loginForm.correo)) {
      fieldErrors.correo = 'Formato de correo inválido'
      return false
    }
    fieldErrors.correo = ''
    return true
  }

  if (field === 'contra') {
    if (!loginForm.contra) {
      fieldErrors.contra = 'La contraseña es obligatoria'
      return false
    }
    if (!RE_PASS.test(loginForm.contra)) {
      fieldErrors.contra = 'La contraseña debe tener al menos 8 caracteres'
      return false
    }
    fieldErrors.contra = ''
    return true
  }

  return false
}

const clearFieldError = (field: 'correo' | 'contra') => {
  fieldErrors[field] = ''
  loginError.value = ''
}


const handleLogin = async () => {
  loginError.value = ''

  const correoOk = validateField('correo')
  const contraOk = validateField('contra')

  if (!correoOk || !contraOk) return

  loginLoading.value = true
  const result = await authStore.login(loginForm.correo, loginForm.contra)
  loginLoading.value = false

  if (result.success) {
    if (authStore.esAdmin)        router.replace('/admin')
    else if (authStore.esCajero)  router.replace('/cajero')
    else if (authStore.esPizzero) router.replace('/panel_pizzero')
  } else {
    loginError.value = result.message || 'Credenciales incorrectas'
  }
}

const handleForgotPassword = () => {
  alert('Contacta a Recursos Humanos para recuperar tu contraseña.')
}


const closeErrorModal = () => {
  modals.error = false
  loginError.value = ''
}
</script>
<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Montserrat', sans-serif;
  background-color: #000000;
  color: #ffffff;
  line-height: 1.6;
  min-height: 100vh;
}
.container {
  width: 100%;
  max-width: 1200px;
  padding: 40px 20px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}
.header { text-align: center; margin-bottom: 50px; }
.logo-wrapper { display: inline-block; margin-bottom: 20px; }
.logo {
  font-size: 52px;
  font-weight: 800;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-decoration: none;
  text-shadow: 3px 3px 0 #ff0000, 6px 6px 0 rgba(0,0,0,0.5);
}
.logo span {
  color: #ff0000;
  text-shadow: 3px 3px 0 #ffffff, 6px 6px 0 rgba(0,0,0,0.5);
}
.subtitle {
  font-size: 18px;
  color: #cccccc;
  letter-spacing: 3px;
  text-transform: uppercase;
  display: inline-block;
  padding: 0 20px;
}
.subtitle::before, .subtitle::after {
  content: "•";
  color: #ff0000;
  margin: 0 10px;
  font-size: 20px;
}
.access-panel {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 20px 40px rgba(255,0,0,0.2), 0 5px 15px rgba(0,0,0,0.3);
  max-width: 550px;
  margin: 0 auto;
  border: 1px solid #ff0000;
  overflow: hidden;
}
.tabs { display: flex; background: #000000; border-bottom: 3px solid #ff0000; }
.tab {
  flex: 1;
  text-align: center;
  padding: 20px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 15px;
  background: #ff0000;
  border-bottom: 3px solid #ffffff;
}
.tab i { margin-right: 10px; color: #ffffff; }
.forms-container { padding: 45px 40px; background: #ffffff; }
.form { display: none; }
.form.active { display: block; }
.form h2 {
  color: #111111;
  margin-bottom: 25px;
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  position: relative;
  padding-bottom: 15px;
}
.form h2::after {
  content: "";
  position: absolute;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: 80px; height: 4px;
  background: #ff0000;
}
.error-banner {
  background: #fff0f0;
  border: 2px solid #ff0000;
  color: #cc0000;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 600;
}
.error-banner i { margin-right: 8px; }
.input-group { position: relative; margin-bottom: 25px; }
.input-group i {
  position: absolute;
  left: 20px; top: 50%;
  transform: translateY(-50%);
  color: #ff0000;
  font-size: 18px;
  z-index: 2;
}
input {
  width: 100%;
  padding: 16px 20px 16px 55px;
  border: 2px solid #e0e0e0;
  border-radius: 50px;
  font-size: 15px;
  transition: all 0.3s;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  color: #111111;
  background: #ffffff;
}
input:focus {
  outline: none;
  border-color: #ff0000;
  box-shadow: 0 0 0 4px rgba(255,0,0,0.1);
}
input::placeholder { color: #999999; font-weight: 400; }
input:disabled { opacity: 0.6; cursor: not-allowed; }
.input-group.focused i { color: #000000; }
.btn {
  width: 100%;
  padding: 16px;
  background: #ff0000;
  color: #ffffff;
  border: 2px solid #ff0000;
  border-radius: 50px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  margin: 10px 0 20px;
  font-family: 'Montserrat', sans-serif;
  text-transform: uppercase;
  letter-spacing: 2px;
}
.btn:hover:not(:disabled) { background: #000000; color: #ffffff; border-color: #ff0000; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn i { margin-right: 10px; }
.employee-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 25px; padding: 15px;
  background: #000000;
  border-radius: 50px;
  color: #ffffff;
  border-left: 5px solid #ff0000;
}
.employee-badge i { color: #ff0000; margin-right: 12px; font-size: 20px; }
.employee-badge span { font-weight: 600; letter-spacing: 1px; }
.forgot-password { text-align: center; margin-top: 20px; }
.forgot-password a { color: #666666; text-decoration: none; font-size: 14px; font-weight: 500; cursor: pointer; }
.forgot-password a:hover { color: #ff0000; }
.info-section { margin-top: 60px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.info-card {
  background: #111111;
  padding: 35px 25px;
  border-radius: 10px;
  border: 1px solid #333333;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}
.info-card:hover { border-color: #ff0000; transform: translateY(-10px); box-shadow: 0 15px 30px rgba(255,0,0,0.15); }
.info-card::after {
  content: "";
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 4px;
  background: #ff0000;
  transform: scaleX(0);
  transition: transform 0.3s;
}
.info-card:hover::after { transform: scaleX(1); }
.info-card i { font-size: 45px; color: #ff0000; margin-bottom: 20px; }
.info-card h3 { margin-bottom: 15px; font-size: 20px; font-weight: 700; color: #ffffff; text-transform: uppercase; }
.info-card p { color: #cccccc; font-size: 15px; line-height: 1.7; }
.modal {
  display: none;
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.9);
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}
.modal.show { display: flex; }
.modal-content {
  background: #ffffff;
  padding: 45px;
  border-radius: 10px;
  max-width: 450px;
  text-align: center;
  border-top: 8px solid #ff0000;
  border-bottom: 8px solid #ff0000;
  animation: modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes modalSlideIn {
  from { transform: translateY(-50px) scale(0.8); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}
.modal-content i { font-size: 80px; color: #ff0000; margin-bottom: 25px; }
.modal-content h3 { font-size: 26px; margin-bottom: 15px; color: #111111; font-weight: 800; text-transform: uppercase; }
.modal-content p { color: #444444; margin-bottom: 30px; font-size: 16px; }
.modal-btn {
  padding: 14px 40px;
  background: #ff0000;
  color: #ffffff;
  border: 2px solid #ff0000;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 2px;
}
.modal-btn:hover { background: #000000; border-color: #ff0000; color: #ffffff; }
.separator { display: flex; align-items: center; justify-content: center; margin: 30px 0; }
.separator-line { height: 2px; width: 100%; background: linear-gradient(to right, transparent, #ff0000, transparent); }
::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-track { background: #000000; }
::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: #cc0000; }
@media (max-width: 768px) {
  .logo { font-size: 38px; }
  .forms-container { padding: 30px 20px; }
  .info-section { grid-template-columns: 1fr; gap: 20px; }
  .tab { padding: 15px 10px; font-size: 13px; }
}
@media (max-width: 480px) {
  .logo { font-size: 28px; }
  .subtitle { font-size: 14px; }
  .form h2 { font-size: 22px; }
}
.field-error {
  display: block;
  color: #cc0000;
  font-size: 12px;
  margin-top: -18px;
  margin-bottom: 14px;
  padding-left: 20px;
  font-weight: 600;
}
</style>
