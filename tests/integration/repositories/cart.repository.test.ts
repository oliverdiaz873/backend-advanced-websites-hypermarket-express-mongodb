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
});
