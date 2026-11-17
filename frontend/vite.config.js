import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue(), tailwindcss()],
    server: env.VITE_FRAPPE_URL ? {
      proxy: {
        '/api': {
          target: env.VITE_FRAPPE_URL,
          changeOrigin: true,
          cookieDomainRewrite: '',
        },
      },
    } : undefined,
  }
})
