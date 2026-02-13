import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import { registerRoutes } from "./routes";
import { createWebSocketServer } from "./websocket";

const app = express();
const server = http.createServer(app);

// Specific CORS policy for production and local development
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://forge-exchange.onrender.com'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Add health check endpoint
app.get("/", (_req, res) => {
  res.status(200).send("Forge API is running");
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

(async () => {
  // Register all the application routes
  await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("API Error:", err);
    res.status(status).json({ message });
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`serving on port ${port}`);
    // Initialize WebSocket server after HTTP server starts
    createWebSocketServer(server);
  });
})();
