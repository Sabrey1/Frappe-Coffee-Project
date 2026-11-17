<script setup>
import { t } from '../utils/language'
</script>

<template>
  <main class="loading-screen" role="status" aria-live="polite">
    <span class="loading-spinner" aria-hidden="true"></span>
    <span>{{ t('Loading…') }}</span>
  </main>
</template>

<style scoped>
.loading-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: #f8f9f6; color: #345b3e; font-size: calc(15px * var(--font-scale, 1)); }
.loading-spinner { width: 34px; height: 34px; border: 3px solid #e2e9df; border-top-color: #345b3e; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .loading-spinner { animation-duration: 2s; } }
</style>
