import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// 1. Opsi buat versi Indonesia
const optionsID = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Maxsten API (ID)", version: "1.0.0" },
    servers: [
      {
        url: process.env.BACKEND_URL,
        description: "Production Server",
      },
    ],
    // 👇 UBAH BAGIAN INI
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        refreshToken: {
          type: "apiKey",
          in: "header",
          name: "x-refresh-token",
          description: "Masukkan refresh token di sini untuk mekanisme auto-refresh (tanpa cookie)."
        }
      },
    },
  },
  apis: ["./src/docs/yaml/id/*.yaml"], // 👈 Arahin ke folder ID
};

const specsID = swaggerJsdoc(optionsID);

export const setupSwagger = (app) => {
  // PENTING: Gunakan swaggerUi.serveFiles biar CSS/JS nya nggak bentrok kalau dipasang di 2 route
  app.use("/docs", swaggerUi.serveFiles(specsID), swaggerUi.setup(specsID));
};
