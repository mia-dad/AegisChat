import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 监听所有地址，方便局域网访问
    port: 5173, // 前端默认端口
    proxy: {
      // 捕获所有以 /api 开头的请求
      '/api': {
        target: 'http://localhost:8080', // 转发目标：您的后台地址
        changeOrigin: true, // 修改 Host 头，欺骗后端以为是同源请求
        secure: false, // 如果后台是 https 自签名证书，设为 false
        // rewrite: (path) => path.replace(/^\/api/, ''), // 如果后台接口路径不包含 /api，请取消注释这行
      },
    },
  },
});