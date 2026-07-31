import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Maxsten",
      version: "1.0.0",
      description:
        "REST API Documentation for Maxsten Store and Cashier Management",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/docs/yaml/*.yaml"],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// 3. Export fungsi untuk dipasang di web.js
export const setupSwagger = (app) => {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
  console.log("📄 Swagger Docs tersedia di: http://localhost:3000/docs");
};
