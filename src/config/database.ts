import mongoose from "mongoose";
import { logger } from "../utils/logger";

let connectionPromise: Promise<void> | undefined;

export const connectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    throw new Error("MONGODB_URI is not defined");
  }

  connectionPromise = mongoose
    .connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: "majority",
      maxPoolSize: 10,
      minPoolSize: 5,
      connectTimeoutMS: 10000,
    })
    .then(() => {
      logger.info("Connected to MongoDB Atlas");

      mongoose.connection.on("error", (error) => {
        logger.error("MongoDB connection error:", error);
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected");
      });
    })
    .finally(() => {
      connectionPromise = undefined;
    });

  return connectionPromise;
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error("Error closing MongoDB connection:", error);
    process.exit(1);
  }
};
