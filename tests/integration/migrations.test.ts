import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import migration1 from "../../src/database/migrations/0001-create-indexes";
import migration2 from "../../src/database/migrations/0002-add-fields";

describe("migraciones", () => {
  let id: ObjectId;

  beforeEach(() => {
    id = new ObjectId();
  });

  describe("0001-create-indexes", () => {
    it("up crea los índices y down los elimina", async () => {
      const db = mongoose.connection.db!;
      const products = db.collection("products");
      await products.insertOne({ _id: id, sku: "sku-1", name: "Arroz" });

      await migration1.up(db);

      const indexes = await products.indexes();
      expect(indexes.map((i) => i.name)).toEqual(
        expect.arrayContaining(["categoryId_1", "brandId_1", "sku_1", "name_text"])
      );

      await migration1.down(db);

      const after = await products.indexes();
      expect(after.map((i) => i.name)).not.toEqual(
        expect.arrayContaining(["categoryId_1", "brandId_1", "sku_1", "name_text"])
      );
    });
  });

  describe("0002-add-fields", () => {
    it("up añade isDeleted/deletedAt y down los elimina", async () => {
      const db = mongoose.connection.db!;
      const products = db.collection("products");
      await products.insertOne({ _id: id, name: "Arroz" });

      await migration2.up(db);

      const doc = await products.findOne({ _id: id });
      expect(doc?.isDeleted).toBe(false);
      expect(doc?.deletedAt).toBeNull();

      await migration2.down(db);

      const after = await products.findOne({ _id: id });
      expect(after?.isDeleted).toBeUndefined();
      expect(after?.deletedAt).toBeUndefined();
    });
  });
});
