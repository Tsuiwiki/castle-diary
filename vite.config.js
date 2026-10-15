import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// npm run build:app（安卓 App）不注册 Service Worker：App 自带离线能力，缓存只会让新版本迟迟不生效
export default defineConfig(({ mode }) => ({
  // 相对路径构建：GitHub Pages 子路径（/仓库名/）下也能跑；WorkBuddy 托管不受影响
  base: './',
  plugins: [
    vue(),
    mode !== 'app' && VitePWA({
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
}))
