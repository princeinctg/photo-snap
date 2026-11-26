import nextEnv from "@next/env";
import mongoose from "mongoose";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (!process.env.MONGODB_URI) {
  console.error("MongoDB check failed: MONGODB_URI is not configured.");
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "photo_studio_os",
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    });
    await mongoose.connection.db.admin().ping();

    console.log(
      JSON.stringify({
        connected: true,
        database: mongoose.connection.db.databaseName,
      })
    );
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "ConnectionError";
    console.error(
      `MongoDB check failed (${errorType}). Verify MONGODB_URI and Atlas network access.`
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
