import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/getOrders': { target: 'http://localhost:5432', changeOrigin: true },
      '/createOrders': { target: 'http://localhost:5432', changeOrigin: true },
      '/updateOrder': { target: 'http://localhost:5432', changeOrigin: true },
      '/deleteOrder': { target: 'http://localhost:5432', changeOrigin: true },
      '/getProducts': { target: 'http://localhost:5432', changeOrigin: true },
      '/createProducts': { target: 'http://localhost:5432', changeOrigin: true },
      '/updateProduct': { target: 'http://localhost:5432', changeOrigin: true },
      '/deleteProduct': { target: 'http://localhost:5432', changeOrigin: true },
      '/getNotes': { target: 'http://localhost:5432', changeOrigin: true },
      '/createNotes': { target: 'http://localhost:5432', changeOrigin: true },
      '/updateNote': { target: 'http://localhost:5432', changeOrigin: true },
      '/deleteNote': { target: 'http://localhost:5432', changeOrigin: true },
      '/signIn': { target: 'http://localhost:5432', changeOrigin: true },
      '/getCategories': { target: 'http://localhost:5432', changeOrigin: true },
      '/createCategories': { target: 'http://localhost:5432', changeOrigin: true },
      '/updateCategorie': { target: 'http://localhost:5432', changeOrigin: true },
      '/deleteCategorie': { target: 'http://localhost:5432', changeOrigin: true },
      '/createOrderItems': { target: 'http://localhost:5432', changeOrigin: true },
    },
  },
})
