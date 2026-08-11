import * as cartRepository from "../../../src/modules/cart/repositories/cart.repository";
import { createTestProduct } from "../helpers/product.helper";
import { createTestUser } from "../helpers/user.helper";

describe("cart.repository (Mongo real)", () => {
  it("createCart es un upsert: dos llamadas devuelven el mismo carrito", async () => {
    const user = await createTestUser();

    const first = await cartRepository.createCart(user.id);
    const second = await cartRepository.createCart(user.id);

    expect(first.id).toBe(second.id);
    expect(first.items).toEqual([]);
  });

  it("findByUserId devuelve el carrito y null si no existe", async () => {
    const user = await createTestUser();
    await cartRepository.createCart(user.id);

    expect((await cartRepository.findByUserId(user.id))?.userId).toBeTruthy();
    expect(await cartRepository.findByUserId("invalid-id")).toBeNull();
  });

  it("addItem agrega y acumula cantidades por producto", async () => {
    const user = await createTestUser();
    const product = await createTestProduct();
    await cartRepository.createCart(user.id);

    await cartRepository.addItem(user.id, product.id, 2);
    const after = await cartRepository.addItem(user.id, product.id, 3);

    expect(after?.items).toEqual([{ productId: product.id, quantity: 5 }]);
  });

  it("addItem devuelve null si el usuario no tiene carrito o el id es inválido", async () => {
    const user = await createTestUser();
    const product = await createTestProduct();

    expect(await cartRepository.addItem(user.id, product.id, 1)).toBeNull();
    expect(await cartRepository.addItem("invalid-id", product.id, 1)).toBeNull();
  });

  it("updateItem actualiza la cantidad y devuelve null si el item no existe", async () => {
    const user = await createTestUser();
    const product = await createTestProduct();
    await cartRepository.createCart(user.id);
    await cartRepository.addItem(user.id, product.id, 2);

    const updated = await cartRepository.updateItem(user.id, product.id, 7);
    expect(updated?.items).toEqual([{ productId: product.id, quantity: 7 }]);

    expect(await cartRepository.updateItem(user.id, "prod_no_existe", 1)).toBeNull();
  });

  it("removeItem elimina el item y clearCart vacía el carrito", async () => {
    const user = await createTestUser();
    const p1 = await createTestProduct();
    const p2 = await createTestProduct();
    await cartRepository.createCart(user.id);
    await cartRepository.addItem(user.id, p1.id, 1);
    await cartRepository.addItem(user.id, p2.id, 2);

    const afterRemove = await cartRepository.removeItem(user.id, p1.id);
    expect(afterRemove?.items).toEqual([{ productId: p2.id, quantity: 2 }]);

    const cleared = await cartRepository.clearCart(user.id);
    expect(cleared?.items).toEqual([]);

    expect(await cartRepository.removeItem(user.id, "prod_no_existe")).toBeNull();
  });

  it("addItem persiste el snapshot de precio/oferta server-side", async () => {
    const user = await createTestUser();
    const product = await createTestProduct();
    await cartRepository.createCart(user.id);

    const snapshot = { unitPrice: 80, originalPrice: 100, discountPercentage: 20 };
    await cartRepository.addItem(user.id, product.id, 2, snapshot);

    const after = await cartRepository.findByUserId(user.id);
    expect(after?.items).toEqual([{ productId: product.id, quantity: 2, ...snapshot }]);
  });

  it("addItem acumula cantidades y refresca el snapshot del item existente", async () => {
    const user = await createTestUser();
    const product = await createTestProduct();
    await cartRepository.createCart(user.id);

    await cartRepository.addItem(user.id, product.id, 2, { unitPrice: 80, originalPrice: 100, discountPercentage: 20 });
    const after = await cartRepository.addItem(user.id, product.id, 3, { unitPrice: 90 });

    expect(after?.items).toEqual([{ productId: product.id, quantity: 5, unitPrice: 90 }]);
  });

  it("mergeItems acumula duplicados dentro de la misma lista y refresca snapshots", async () => {
    const user = await createTestUser();
    const p1 = await createTestProduct();
    await cartRepository.createCart(user.id);
    await cartRepository.addItem(user.id, p1.id, 2, { unitPrice: 10 });

    const after = await cartRepository.mergeItems(user.id, [
      { productId: p1.id, quantity: 3, unitPrice: 8 },
      { productId: p1.id, quantity: 1, unitPrice: 8 },
    ]);

    expect(after?.items).toEqual([{ productId: p1.id, quantity: 6, unitPrice: 8 }]);
  });

  it("mergeItems devuelve null si el usuario no tiene carrito", async () => {
    const user = await createTestUser();
    expect(await cartRepository.mergeItems(user.id, [{ productId: "x", quantity: 1 }])).toBeNull();
  });

  it("addItem concurrente: el $inc atómico no pierde incrementos", async () => {
    const user = await createTestUser();
    const product = await createTestProduct();
    await cartRepository.createCart(user.id);
    await cartRepository.addItem(user.id, product.id, 1);

    await Promise.all(Array.from({ length: 10 }, () => cartRepository.addItem(user.id, product.id, 1)));

    const cart = await cartRepository.findByUserId(user.id);
    expect(cart?.items).toEqual([{ productId: product.id, quantity: 11 }]);
  });

  it("mergeItems concurrente acumula cantidades sin pérdidas", async () => {
    const user = await createTestUser();
    const product = await createTestProduct();
    await cartRepository.createCart(user.id);
    await cartRepository.addItem(user.id, product.id, 1);

    await Promise.all(
      Array.from({ length: 5 }, () =>
        cartRepository.mergeItems(user.id, [{ productId: product.id, quantity: 2, unitPrice: 10 }])
      )
    );

    const cart = await cartRepository.findByUserId(user.id);
    expect(cart?.items).toEqual([{ productId: product.id, quantity: 11, unitPrice: 10 }]);
  });

  it("updateItem concurrente mantiene la última escritura sin duplicar items", async () => {
    const user = await createTestUser();
    const product = await createTestProduct();
    await cartRepository.createCart(user.id);
    await cartRepository.addItem(user.id, product.id, 1);

    await Promise.all([
      cartRepository.updateItem(user.id, product.id, 3),
      cartRepository.updateItem(user.id, product.id, 7),
    ]);

    const cart = await cartRepository.findByUserId(user.id);
    expect(cart?.items).toHaveLength(1);
    expect([3, 7]).toContain(cart?.items[0].quantity);
  });
});
