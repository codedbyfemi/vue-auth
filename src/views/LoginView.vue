<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(form)
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
    <h1>Sign in</h1>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <label for="email">Email</label>
    <input id="email" type="email" v-model.trim="form.email" autocomplete="email" required />

    <label for="password">Password</label>
    <input
      id="password"
      type="password"
      v-model="form.password"
      autocomplete="current-password"
      required
    />

    <button class="btn" type="submit" :disabled="loading">
      {{ loading ? 'Signing in…' : 'Sign in' }}
    </button>
    <p class="switch">New here? <RouterLink to="/register">Create an account</RouterLink></p>
  </form>
</template>
