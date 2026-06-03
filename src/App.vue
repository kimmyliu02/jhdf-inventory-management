<script setup>
import { onMounted } from 'vue'
import { seedIfEmpty } from './db/index.js'

onMounted(() => seedIfEmpty())
</script>

<template>
  <div id="app-shell">
    <RouterView />
  </div>
</template>
