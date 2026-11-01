<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')
</script>

<template>
  <section>
    <h1>Welcome back, {{ firstName }}.</h1>
    <div class="card">
      <p><strong>Name:</strong> {{ auth.user?.name }}</p>
      <p><strong>Email:</strong> {{ auth.user?.email }}</p>
    </div>
  </section>
</template>