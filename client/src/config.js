const isProduction = import.meta.env.MODE === 'production';

export const API_URL = isProduction 
  ? 'https://castellatus-zander-puristically.ngrok-free.dev' // <-- Paste link Ngrok baru di sini
  : 'http://localhost:3000';