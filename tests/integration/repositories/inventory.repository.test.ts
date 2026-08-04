import * as inventoryRepository from "../../../src/modules/inventory/repositories/inventory.repository";
import { createTestInventory } from "../helpers/inventory.helper";
import { createTestProduct } from "../helpers/product.helper";

describe("inventory.repository (Mongo real)", () => {
  it("findAll devuelve todos los registros", async () => {
    const p1 = await createTestProduct();
    const p2 = await createTestProduct();
    await createTestInventory(p1.id);
    await createTestInventory(p2.id);

    const records = await inventoryRepository.findAll();

    expect(records).toHaveLength(2);
  });

  it("findById devuelve el registro y null con id inválido", async () => {
    const product = await createTestProduct();
    const created = await createTestInventory(product.id);

    const found = await inventoryRepository.findById(created.id);
    expect(found?.productId).toBe(product.id);

    expect(await inventoryRepository.findById("invalid-id")).toBeNull();
    expect(await inventoryRepository.findById("64b00000000000000000ffff")).toBeNull();
  });

  it("findByProductId devuelve el registro del producto", async () => {
    const product = await createTestProduct();
    await createTestInventory(product.id, { stock: 7 });

    const record = await inventoryRepository.findByProductId(product.id);
    expect(record?.stock).toBe(7);
  });

  it("findLowStock incluye solo registros con minStock alcanzado", async () => {
    const low = await createTestProduct();
    const ok = await createTestProduct();
    const noMin = await createTestProduct();
    await createTestInventory(low.id, { stock: 2, minStock: 5 });
    await createTestInventory(ok.id, { stock: 10, minStock: 5 });
    await createTestInventory(noMin.id, { stock: 1 });

    const lowStock = await inventoryRepository.findLowStock();

    expect(lowStock.map((r) => r.productId)).toContain(low.id);
    expect(lowStock.map((r) => r.productId)).not.toContain(ok.id);
    expect(lowStock.map((r) => r.productId)).not.toContain(noMin.id);
  });

  it("decreaseStock es atómico: dos compradores compiten por el mismo stock", async () => {
    const product = await createTestProduct();
    await createTestInventory(product.id, { stock: 5 });

    const [buyerA, buyerB] = await Promise.all([
      inventoryRepository.decreaseStock(product.id, 5),
      inventoryRepository.decreaseStock(product.id, 5),
    ]);

    expect([buyerA, buyerB].filter(Boolean)).toHaveLength(1);
    const after = await inventoryRepository.findByProductId(product.id);
    expect(after?.stock).toBe(0);
  });

  it("decreaseStock devuelve null si no hay stock disponible (considerando reservado)", async () => {
    const product = await createTestProduct();
    await createTestInventory(product.id, { stock: 5, reservedStock: 3 });

    const result = await inventoryRepository.decreaseStock(product.id, 5);

    expect(result).toBeNull();
  });

  it("restoreStock incrementa el stock", async () => {
    const product = await createTestProduct();
    await createTestInventory(product.id, { stock: 0 });

    const restored = await inventoryRepository.restoreStock(product.id, 3);

    expect(restored?.stock).toBe(3);
  });

  it("increaseById incrementa el stock", async () => {
    const product = await createTestProduct();
    const created = await createTestInventory(product.id, { stock: 10 });

    const updated = await inventoryRepository.increaseById(created.id, 5);

    expect(updated?.stock).toBe(15);
  });

  it("decreaseById decrementa el stock y respeta el guard de disponibilidad", async () => {
    const product = await createTestProduct();
    const created = await createTestInventory(product.id, { stock: 10 });

    const ok = await inventoryRepository.decreaseById(created.id, 4);
    expect(ok?.stock).toBe(6);

    const blocked = await inventoryRepository.decreaseById(created.id, 10);
    expect(blocked).toBeNull();
  });

  it("setStockById fija el stock absoluto", async () => {
    const product = await createTestProduct();
    const created = await createTestInventory(product.id, { stock: 10 });

    const updated = await inventoryRepository.setStockById(created.id, 30);

    expect(updated?.stock).toBe(30);
  });

  it("setMinStockById fija el mínimo", async () => {
    const product = await createTestProduct();
    const created = await createTestInventory(product.id);

    const updated = await inventoryRepository.setMinStockById(created.id, 4);

    expect(updated?.minStock).toBe(4);
  });

  it("findOutOfStock devuelve solo los registros sin stock disponible", async () => {
    const out = await createTestProduct();
    const ok = await createTestProduct();
    await createTestInventory(out.id, { stock: 0 });
    await createTestInventory(ok.id, { stock: 10, reservedStock: 2 });

    const result = await inventoryRepository.findOutOfStock();

    expect(result.map((r) => r.productId)).toContain(out.id);
    expect(result.map((r) => r.productId)).not.toContain(ok.id);
  });

  it("findPage pagina y filtra por estado", async () => {
    const low = await createTestProduct();
    const out = await createTestProduct();
    const ok = await createTestProduct();
    await createTestInventory(low.id, { stock: 2, minStock: 5 });
    await createTestInventory(out.id, { stock: 0 });
    await createTestInventory(ok.id, { stock: 50, minStock: 5 });

    const all = await inventoryRepository.findPage({ page: 1, limit: 10, status: "all" });
    expect(all.total).toBe(3);

    const lowPage = await inventoryRepository.findPage({ page: 1, limit: 10, status: "low-stock" });
    expect(lowPage.items.map((r) => r.productId)).toContain(low.id);
    expect(lowPage.items.map((r) => r.productId)).not.toContain(out.id);
    expect(lowPage.items.map((r) => r.productId)).not.toContain(ok.id);

    const outPage = await inventoryRepository.findPage({ page: 1, limit: 10, status: "out-of-stock" });
    expect(outPage.items.map((r) => r.productId)).toContain(out.id);
    expect(outPage.items.map((r) => r.productId)).not.toContain(low.id);
  });

  it("deriveStatus calcula out-of-stock, low-stock y ok", () => {
    expect(inventoryRepository.deriveStatus({ stock: 0, reservedStock: 0 })).toBe("out-of-stock");
    expect(inventoryRepository.deriveStatus({ stock: 3, reservedStock: 0, minStock: 5 })).toBe("low-stock");
    expect(inventoryRepository.deriveStatus({ stock: 10, reservedStock: 0, minStock: 5 })).toBe("ok");
  });
});
