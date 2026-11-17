<script setup>
import { t } from '../../utils/language.js'
import { ref } from 'vue'
import { fontSize, setFontSize } from '../../utils/fontSize'
import { defaultCardLayout, loadCardLayout, normalizeCardLayout, saveCardLayout } from '../../utils/cardLayout'

const storageError = ref(false)
const cardLayout = ref(loadCardLayout())
const cardLayoutError = ref(false)
function chooseSize(value) {
  storageError.value = !setFontSize(value)
}
function updateCardLayout(field, value) {
  cardLayout.value = normalizeCardLayout({ ...cardLayout.value, [field]: value })
  cardLayoutError.value = !saveCardLayout(cardLayout.value)
}
function resetCardLayout() {
  cardLayout.value = { ...defaultCardLayout }
  cardLayoutError.value = !saveCardLayout(cardLayout.value)
}
</script>

<template>
  <section class="settings-page" aria-labelledby="settings-title">
    <div class="settings-heading"><p class="settings-kicker">{{ t("YOUR PREFERENCES") }}</p><h1 id="settings-title">{{ t("Settings") }}</h1><p>{{ t("Make your workspace comfortable for you.") }}</p></div>
    <div class="settings-card"><div class="settings-card-title"><span class="settings-icon" aria-hidden="true">Aa</span><div><h2>{{ t("Font size") }}</h2><p>{{ t("Choose the text size that feels right.") }}</p></div></div>
      <div class="font-slider"><div class="slider-heading"><label for="font-size-slider">{{ t("Text size") }}</label><output for="font-size-slider">{{ fontSize }}%</output></div><input id="font-size-slider" type="range" min="90" max="130" step="5" :value="fontSize" :aria-valuetext="`${fontSize}%`" @input="chooseSize($event.target.value)"><div class="slider-labels"><span>{{ t("Smaller") }}</span><button type="button" @click="chooseSize(100)">{{ t("Reset to 100%") }}</button><span>{{ t("Larger") }}</span></div></div>
    </div>
    <div class="settings-card layout-settings"><div class="settings-card-title"><span class="settings-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg></span><div><h2>{{ t('Card layout') }}</h2><p>{{ t('Adjust product cards on the Sales screen.') }}</p></div></div><div class="layout-controls"><div class="layout-control"><div class="slider-heading"><label for="card-columns">{{ t('Columns') }}</label></div><select id="card-columns" :value="cardLayout.columns" @change="updateCardLayout('columns', $event.target.value)"><option :value="0">{{ t('Automatic') }}</option><option v-for="count in 6" :key="count" :value="count">{{ count }}</option></select></div><div class="layout-control"><div class="slider-heading"><label for="card-width">{{ t('Card width') }}</label><output for="card-width">{{ cardLayout.width ? `${cardLayout.width} px` : t('Automatic') }}</output></div><input id="card-width" type="range" min="140" max="320" step="10" :value="cardLayout.width || 220" @input="updateCardLayout('width', $event.target.value)"></div><div class="layout-control"><div class="slider-heading"><label for="card-height">{{ t('Minimum card height') }}</label><output for="card-height">{{ cardLayout.height ? `${cardLayout.height} px` : t('Automatic') }}</output></div><input id="card-height" type="range" min="180" max="360" step="10" :value="cardLayout.height || 240" @input="updateCardLayout('height', $event.target.value)"></div><button type="button" class="layout-reset" @click="resetCardLayout">{{ t('Reset layout') }}</button><p v-if="cardLayoutError" class="settings-notice" role="alert">{{ t('Card layout could not be saved on this device.') }}</p></div></div>
  </section>
</template>

<style scoped>
.settings-page{width:100%;max-width:800px;margin:0 auto}.settings-heading{margin-bottom:26px}.settings-kicker{font-size:calc(10px * var(--font-scale, 1));letter-spacing:1.2px;font-weight:750;color:#8b9b88;margin:0 0 9px}.settings-heading h1{font-size:calc(28px * var(--font-scale, 1))}.settings-heading>p:last-child{font-size:calc(14px * var(--font-scale, 1));color:#929b90;margin:9px 0 0}.settings-card{border:1px solid #eaede7;border-radius:12px;background:#fff;padding:28px}.settings-card-title{display:flex;gap:13px;align-items:center}.settings-icon{height:44px;width:44px;flex:none;display:grid;place-items:center;border-radius:11px;background:#eff4ec;color:#64805f;font-size:calc(16px * var(--font-scale, 1));font-weight:700}.settings-card-title h2{font-size:calc(17px * var(--font-scale, 1));font-weight:650;color:#354035;margin:0}.settings-card-title p{font-size:calc(13px * var(--font-scale, 1));color:#929b90;margin:5px 0 0}.settings-preview{margin-top:24px;padding:19px;border-radius:9px;background:#f6f8f4}.settings-preview span,.settings-preview strong{display:block}.settings-preview span{font-size:calc(10px * var(--font-scale, 1));letter-spacing:1px;font-weight:700;color:#9aa999}.settings-preview strong{font-size:calc(16px * var(--font-scale, 1));color:#415540;margin-top:9px}.settings-preview p{font-size:calc(13px * var(--font-scale, 1));color:#8b9989;margin:6px 0 0}.settings-saved,.settings-notice{margin:18px 0 0;color:#849781;font-size:calc(12px * var(--font-scale, 1))}.settings-notice{color:#ad4941}@media(max-width:600px){.settings-card{padding:20px}.settings-heading h1{font-size:calc(25px * var(--font-scale, 1))}}
</style>
<style scoped>
.font-slider { margin-top: 28px; padding: 18px; border: 1px solid #e9ede7; border-radius: 9px; }
.slider-heading, .slider-labels { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.slider-heading label { color: #465744; font-size: calc(14px * var(--font-scale, 1)); font-weight: 650; }
.slider-heading output { color: #537b52; font-size: calc(13px * var(--font-scale, 1)); font-weight: 700; }
.font-slider input { display: block; width: 100%; margin: 20px 0 14px; accent-color: #345b3e; cursor: pointer; }
.font-slider input:focus-visible { outline: 3px solid #b3c6a4; outline-offset: 4px; }
.slider-labels { color: #929f90; font-size: calc(11px * var(--font-scale, 1)); }
.slider-labels button { padding: 4px; border: 0; background: transparent; color: #537b52; font-size: inherit; font-weight: 600; }
.layout-settings { margin-top: 18px; }
.settings-icon svg { width: 22px; height: 22px; stroke: currentColor; stroke-width: 1.6; }
.layout-controls { display: grid; gap: 20px; margin-top: 26px; }
.layout-control select { width: 100%; margin-top: 9px; padding: 10px 12px; border: 1px solid #e2e8e0; border-radius: 8px; background: #fff; color: #465744; font-size: calc(13px * var(--font-scale, 1)); }
.layout-control input[type="range"] { display: block; width: 100%; margin-top: 14px; accent-color: #345b3e; cursor: pointer; }
.layout-control input:focus-visible, .layout-control select:focus-visible { outline: 3px solid #b3c6a4; outline-offset: 3px; }
.layout-reset { justify-self: start; padding: 9px 13px; border: 1px solid #e2e8e0; border-radius: 8px; background: #fff; color: #537b52; font-size: calc(12px * var(--font-scale, 1)); font-weight: 600; }
.layout-reset:hover { background: #f5f8f3; }
.layout-controls .settings-notice { margin: 0; }
</style>
