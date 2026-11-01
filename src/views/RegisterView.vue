<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ name: '', email: '', password: '', confirm: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (form.password.length < 8) {
    error.value = 'Use at least 8 characters for your password.'
    return
  }
  if (form.password !== form.confirm) {
    error.value = 'Passwords don’t match.'
    return
  }
  loading.value = true
  try {
    await auth.register({ name: form.name, email: form.email, password: form.password })
    router.push({ name: 'home' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="card" @submit.prevent="submit">
    <h1>Create account</h1>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <label for="name">Full name</label>
    <input id="name" v-model.trim="form.name" autocomplete="name" required />

    <label for="email">Email</label>
    <input id="email" type="email" v-model.trim="form.email" autocomplete="email" required />

    <label for="password">Password</label>
    <input
      id="password"
      type="password"
      v-model="form.password"
      autocomplete="new-password"
      required
    />

    <label for="confirm">Confirm password</label>
    <input
      id="confirm"
      type="password"
      v-model="form.confirm"
      autocomplete="new-password"
      required
    />

    <button class="btn" type="submit">Create account</button>
    <p class="switch">Already registered? <RouterLink to="/login">Sign in</RouterLink></p>
  </form>
</template>
