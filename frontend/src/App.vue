<script setup>
import { useRoute } from 'vue-router'
import Sidebar from './sidebar/sidebar.vue'

const route = useRoute()
</script>

<template>
  <RouterView v-if="route.meta.standalone" />
  <Sidebar v-else />
</template>
