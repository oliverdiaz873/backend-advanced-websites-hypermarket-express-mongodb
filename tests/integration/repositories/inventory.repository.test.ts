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

  it("updateById ajusta stock y minStock", async () => {
    const product = await createTestProduct();
    const created = await createTestInventory(product.id);

    const updated = await inventoryRepository.updateById(created.id, { stock: 20, minStock: 4 });

    expect(updated?.stock).toBe(20);
    expect(updated?.minStock).toBe(4);
  });
});
