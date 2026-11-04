import mongoose from "mongoose";

// Cache the connection promise across hot reloads and concurrent calls.
const globalForMongoose = globalThis as unknown as {
  _mongoosePromise?: Promise<typeof mongoose> | null;
};

export default async function dbConnect(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;

  const uri = process.env.MONGO_DB_URI;
  if (!uri) {
    throw new Error("MONGO_DB_URI is not set. Add it to your environment variables.");
  }

  if (!globalForMongoose._mongoosePromise) {
    globalForMongoose._mongoosePromise = mongoose
      .connect(uri, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {})
      .then((m) => {
        console.log(`MongoDB connected. Host = ${m.connection.host}`);
        return m;
      })
      .catch((error) => {
        globalForMongoose._mongoosePromise = null; // allow retry
        console.error("Error connecting to MongoDB [at dbConnect]:", error);
        throw error;
      });
  }

  return globalForMongoose._mongoosePromise;
}
