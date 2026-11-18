<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({ option: { type: Object, required: true }, label: { type: String, required: true } })
const container = ref(null)
let chart
let observer

onMounted(() => {
  chart = echarts.init(container.value)
  chart.setOption(props.option)
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(container.value)
  } else {
    window.addEventListener('resize', resize)
  }
})
function resize() { chart?.resize() }
watch(() => props.option, option => chart?.setOption(option, true))
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
</script>

<template>
  <div ref="container" class="dashboard-chart" role="img" :aria-label="label"></div>
</template>

<style scoped>
.dashboard-chart { width: 100%; height: 300px; }
</style>
