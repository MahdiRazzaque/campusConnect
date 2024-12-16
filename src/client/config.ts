/// <reference types="vite/client" />

const isProd = process.env.NODE_ENV === 'production';

export const API_BASE_URL = isProd
  ? 'https://campusconnect.duckdns.org/api'
  : 'http://localhost:3000/api';