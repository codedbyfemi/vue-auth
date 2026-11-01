<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function signOut() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="top">
    <strong class="brand">Trellis</strong>
    <button v-if="auth.isLoggedIn" class="btn ghost" @click="signOut">Sign out</button>
  </header>
  <main class="page">
    <RouterView />
  </main>
</template>

<style scoped></style>
