import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables - prioritizing correct path resolution
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Fallback to standard dotenv loading
  dotenv.config();
}

import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { connectDatabase } from "./config/database";
import { swaggerSpec } from "./config/swagger";
import { errorHandler } from "./middleware/error.middleware";
import { logger } from "./utils/logger";
import { authRouter } from "./modules/auth/auth.routes";
import { userRouter } from "./modules/users/user.routes";
import { projectRouter } from "./modules/projects/project.routes";
import { procurementRouter } from "./modules/procurement/procurement.routes";
import { timelineRouter } from "./modules/timeline/timeline.routes";
import { financeRouter } from "./modules/finance/routes/finance.routes";
// import { configureCloudinary } from "./config/cloudinary";
import { utilsRouter } from "./modules/Utils/enum.routes";
import { companyRouter } from "./modules/users/company/company.routes";
import { biddingRouter } from "./modules/bidding/routes/bidding.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { subscriptionRouter } from "./modules/subscription/subscription.routes";
import { uploadRouter } from "./modules/file/upload.routes";
import { sanitizeInput } from "./middleware/sanitize.middleware";
import { authRateLimiter } from "./middleware/rateLimiter.middleware";

if (process.env.VERCEL !== "1") {
  require("./modules/subscription/subscription.cron");
}

// // Configure Cloudinary
// configureCloudinary();

// Create Express app
const app = express();

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: ["https://www.tbed.rw", "https://tbed.rw"],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-active-company-id',
      'x-active-project-id'
    ],
  })
);
app.use(async (req, res, next) => {
  if (
    process.env.VERCEL !== "1" ||
    req.method === "OPTIONS" ||
    req.path === "/health"
  ) {
    return next();
  }

  try {
    await connectDatabase();
    return next();
  } catch (error) {
    logger.error("MongoDB connection unavailable:", error);
    return res.status(503).json({
      success: false,
      message: "Service temporarily unavailable",
    });
  }
});
app.use(express.json({ limit: '50mb',}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(sanitizeInput);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api-docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/v1/auth", authRateLimiter, authRouter);
// app.use("/api/v1", apiRateLimiter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/companies", companyRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/procurement", procurementRouter);
app.use("/api/v1/bidding", biddingRouter);
app.use("/api/v1/timeline", timelineRouter);
app.use("/api/v1/finance/", financeRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/utils", utilsRouter);
app.use("/api/v1/upload", uploadRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);

// Error handler
app.use(errorHandler);

// Handle unhandled routes
app.use("*", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(
        `Swagger documentation available at http://localhost:${PORT}/api-docs`
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

export const setupErrorHandlers = () => {
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception:", error);
    // In production, prefer logging over exiting to avoid downtime
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  });

  process.on("unhandledRejection", (reason: any) => {
    logger.error("Unhandled Rejection:", reason);
    // Avoid killing the server in production
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  });
};

if (process.env.VERCEL !== "1") {
  setupErrorHandlers();
  startServer();
}

export default app;
