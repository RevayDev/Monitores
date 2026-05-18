module.exports = {
  apps: [{
    name: "monitores-backend",
    script: "server.js",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      MYSQL_HOST: "localhost",
      MYSQL_USER: "root",
      MYSQL_PASSWORD: "TU_PASSWORD_DB_AQUI", // Cambiar en la VM
      MYSQL_DATABASE: "monitores_db",
      FRONTEND_URL: "https://tu-app-vercel.vercel.app" // Cambiar por el dominio real de Vercel
    }
  }]
}
