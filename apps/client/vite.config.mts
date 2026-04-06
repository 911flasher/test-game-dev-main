/**
 * Конфигурация Vite для клиентской части приложения (React).
 * Основная цель файла: настройка сборки, плагинов (React, Tailwind CSS)
 * и локального сервера разработки с проксированием запросов к бэкенду.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Подключение плагинов для поддержки React JSX и нового TailwindCSS v4
  plugins: [react(), tailwindcss()],
  server: {
    // Порт, на котором будет доступен клиент в режиме разработки
    port: 5173,
    // Настройка прокси для того, чтобы клиент мог обращаться к API 
    // и WebSocket на бэкенде (порт 3001) без проблем с CORS
    proxy: {
      '/ws': {
        target: 'http://localhost:3001',
        ws: true, // Включает поддержку WebSocket (проксирование событий апгрейда соединения)
      },
      '/api': {
        target: 'http://localhost:3001',
      },
    },
  },
});
