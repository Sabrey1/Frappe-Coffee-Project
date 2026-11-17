<script setup>
import { t } from '../utils/language.js'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../service/api_services'

const router = useRouter()
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function login() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    await api.post('/api/method/login', { usr: username.value, pwd: password.value })
    await router.push('/sales')
  } catch {
    error.value = 'Unable to sign in. Please check your details and try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-brand"><div class="login-brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 9h11v4.5a5.5 5.5 0 0 1-11 0V9ZM16 10h1.25a2.25 2.25 0 1 1 0 4.5H16M8 4.5v1.7M12 4.5v1.7M4 20h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><strong>Frappe</strong><span>{{ t("COFFEE WORKSPACE") }}</span></div></div>
    <section class="login-card" aria-labelledby="login-title">
      <div class="login-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 9h11v4.5a5.5 5.5 0 0 1-11 0V9ZM16 10h1.25a2.25 2.25 0 1 1 0 4.5H16M8 4v2M12 4v2M4 20h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <p class="login-eyebrow">{{ t("WELCOME BACK") }}</p>
      <h1 id="login-title">{{ t("Good to see you again.") }}</h1>
      <p class="login-description">{{ t("Sign in to your coffee workspace.") }}</p>
      <form class="login-form" @submit.prevent="login">
        <label for="username">{{ t("Email or username") }}</label>
        <input id="username" v-model.trim="username" type="text" autocomplete="username" :placeholder="t('Enter your email or username')" required>
        <label for="password">{{ t("Password") }}</label>
        <div class="password-field"><input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" :placeholder="t('Enter your password')" required><button type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" :aria-pressed="showPassword" @click="showPassword = !showPassword">{{ t(showPassword ? 'Hide' : 'Show') }}</button></div>
        <p v-if="error" class="login-error" role="alert">{{ t(error) }}</p>
        <button class="login-submit" type="submit" :disabled="loading">{{ loading ? 'Signing in…' : 'Sign in' }} <span aria-hidden="true">→</span></button>
      </form>
    </section>
    <p class="login-footer">{{ t("Made for good coffee. And the people behind it.") }}</p>
  </main>
</template>

<style scoped>
.login-page{min-height:100vh;background:#f8f9f6;display:flex;flex-direction:column;align-items:center;padding:46px 20px 28px}.login-brand{display:flex;align-items:center;gap:11px;align-self:flex-start;margin-left:4%;}.login-brand-mark{width:39px;height:39px;border-radius:11px;background:#34513d;color:white;display:grid;place-items:center}.login-brand-mark svg{width:24px}.login-brand strong,.login-brand span{display:block}.login-brand strong{font-size:calc(17px * var(--font-scale, 1));line-height:1.2;letter-spacing:-.5px}.login-brand span{font-size:calc(9px * var(--font-scale, 1));letter-spacing:1.05px;color:#a0a69d;font-weight:700;margin-top:4px}.login-card{width:100%;max-width:440px;margin:auto;background:#fff;border:1px solid #e9ede6;border-radius:16px;padding:44px;box-shadow:0 14px 50px rgba(48,68,46,.04)}.login-icon{width:50px;height:50px;display:grid;place-items:center;border-radius:14px;background:#eff4ec;color:#64805f;margin-bottom:27px}.login-icon svg{width:27px;height:27px}.login-eyebrow{font-size:calc(10px * var(--font-scale, 1));letter-spacing:1.4px;color:#8b9b88;font-weight:750;margin:0 0 10px}.login-card h1{font-size:calc(27px * var(--font-scale, 1));letter-spacing:-.9px}.login-description{font-size:calc(14px * var(--font-scale, 1));color:#929b90;margin:10px 0 0}.login-form{display:flex;flex-direction:column;margin-top:32px}.login-form label{font-size:calc(13px * var(--font-scale, 1));font-weight:650;color:#485448;margin-bottom:9px}.login-form input{height:48px;width:100%;border:1px solid #e2e8e0;border-radius:8px;background:#fff;padding:0 14px;color:#303b30;font:inherit;font-size:calc(13px * var(--font-scale, 1));outline:none}.login-form input:focus{border-color:#799776;box-shadow:0 0 0 3px #edf3eb}.login-form input::placeholder{color:#b4bcb2}.login-form>input{margin-bottom:22px}.password-field{position:relative}.password-field input{padding-right:65px}.password-field button{position:absolute;right:12px;top:0;height:48px;border:0;background:transparent;color:#768b75;font-size:calc(12px * var(--font-scale, 1));font-weight:650}.login-submit{height:49px;margin-top:28px;border:0;border-radius:8px;background:#345b3e;color:#fff;font-size:calc(14px * var(--font-scale, 1));font-weight:650;position:relative}.login-submit:hover{background:#294c32}.login-submit:disabled{opacity:.7;cursor:wait}.login-submit span{position:absolute;right:17px;font-size:calc(19px * var(--font-scale, 1));line-height:1}.login-error{font-size:calc(12px * var(--font-scale, 1));color:#b3443d;margin:12px 0 -12px;line-height:1.5}.login-footer{font-size:calc(12px * var(--font-scale, 1));color:#a2aba0;margin:30px 0 0;text-align:center}@media(max-width:520px){.login-page{padding:25px 20px}.login-brand{margin-left:0}.login-card{padding:32px 25px}.login-card h1{font-size:calc(24px * var(--font-scale, 1))}}
</style>
