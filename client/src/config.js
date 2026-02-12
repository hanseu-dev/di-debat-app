const isProduction = import.meta.env.MODE === 'production';

export const API_URL = isProduction 
  ? 'https://di-debat-server.edgeone.dev' 
  : 'http://localhost:3000';
  // ? 'https://castellatus-zander-puristically.ngrok-free.dev' // <-- Paste link Ngrok baru di sini
  // // : 'http://localhost:3000'
  // : 'di-debat-server.edgeone.dev';