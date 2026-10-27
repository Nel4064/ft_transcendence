import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 1024,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 确保这里的端口是你的后端端口
        changeOrigin: true,
        secure: false,
        // ❌ 检查这里：绝对不能有 rewrite 相关的代码！
      },
    },
  },
})