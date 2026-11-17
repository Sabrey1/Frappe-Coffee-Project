<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from './sidebar/sidebar.vue'
import Loading from './components/loading.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)

onMounted(async () => {
  try { await router.isReady() } finally { loading.value = false }
})
</script>

<template>
  <Loading v-if="loading" />
  <RouterView v-else-if="route.meta.standalone" />
  <Sidebar v-else />
</template>
