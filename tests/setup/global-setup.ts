import path from "path";
import dotenv from "dotenv";
import { MongoMemoryServer } from "mongodb-memory-server";

dotenv.config({ path: path.resolve(__dirname, "../../.env.test"), override: true });

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = "test";

  const mongod = await MongoMemoryServer.create();
  globalThis.__MONGOINSTANCE__ = mongod;
  process.env.MONGODB_URI = mongod.getUri();
}
