import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 相对路径构建：GitHub Pages 子路径（/仓库名/）下也能跑；WorkBuddy 托管不受影响
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '城堡日记',
        short_name: '城堡日记',
        description: '绘本阅读、识字翻卡、餐桌玩具、药箱健康、相册周报——宝宝成长的全能小城堡',
        theme_color: '#f0934b',
        background_color: '#fff9f0',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5174,
    allowedHosts: true,
  }
})
