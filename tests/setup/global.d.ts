import type { MongoMemoryServer } from "mongodb-memory-server";

declare global {
  var __MONGOINSTANCE__: MongoMemoryServer | undefined;
}

export {};
