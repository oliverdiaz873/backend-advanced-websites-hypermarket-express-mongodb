import mongoose from "mongoose";
import { OrderModel } from "../../src/modules/orders/models/order.model";

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI no definido. Ejecuta el globalSetup primero.");
  }
  const workerId = process.env.JEST_WORKER_ID ?? "1";
  await mongoose.connect(uri, { dbName: `test_${workerId}` });
  await OrderModel.init();
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  jest.restoreAllMocks();
});
