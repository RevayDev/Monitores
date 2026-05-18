module.exports = {
  apps: [{
    name: "monitores-backend",
    script: "./server.js",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 3000,

      MYSQL_HOST: "localhost",
      MYSQL_USER: "root",
      MYSQL_PASSWORD: "072007",
      MYSQL_DATABASE: "monitores_db",

      FRONTEND_URL: "https://monitores.vercel.app"
    }
  }]
};
