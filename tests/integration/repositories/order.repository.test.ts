import { OrderModel } from "../../../src/modules/orders/models/order.model";
import * as orderRepository from "../../../src/modules/orders/repositories/order.repository";
import { createTestOrder } from "../helpers/order.helper";
import { createTestUser } from "../helpers/user.helper";

describe("order.repository (Mongo real)", () => {
  it("create persiste la orden con snapshot de items y dirección", async () => {
    const user = await createTestUser();

    const order = await orderRepository.create(
      user.id,
      [
        { productId: "prod_1", name: "Arroz 1kg", price: 89.5, image: "img.png", quantity: 2 },
        { productId: "prod_2", name: "Fideos", price: 45, image: "img.png", quantity: 1 },
      ],
      3,
      224,
      {
        label: "Casa",
        street: "Av. Principal 123",
        city: "Lima",
        state: "Lima",
        zipCode: "15001",
        country: "Peru",
      }
    );

    expect(order.id).toBeTruthy();
    expect(order.items).toHaveLength(2);
    expect(order.items[0]).toMatchObject({ productId: "prod_1", name: "Arroz 1kg", quantity: 2 });
    expect(order.shippingAddress).toMatchObject({ city: "Lima", country: "Peru" });
    expect(order.status).toBe("pending");
    expect(order.paymentStatus).toBe("pending");
  });

  it("findByUserId devuelve las órdenes del usuario ordenadas por createdAt desc", async () => {
    const user = await createTestUser();
    const older = await OrderModel.create({
      userId: user.id,
      items: [],
      totalItems: 0,
      subtotal: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newer = await OrderModel.create({
      userId: user.id,
      items: [],
      totalItems: 0,
      subtotal: 0,
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    const orders = await orderRepository.findByUserId(user.id);

    expect(orders.map((o) => o.id)).toEqual([newer.id, older.id]);
  });

  it("findById devuelve la orden y null con id inválido", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id, []);

    expect((await orderRepository.findById(order.id))?.id).toBe(order.id);
    expect(await orderRepository.findById("invalid-id")).toBeNull();
  });

  it("updateStatus con CAS: transición válida actualiza, expectedStatus desactualizado devuelve null", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id, []);

    const updated = await orderRepository.updateStatus(order.id, "pending", "processing");
    expect(updated?.status).toBe("processing");

    const stale = await orderRepository.updateStatus(order.id, "pending", "completed");
    expect(stale).toBeNull();
    expect((await orderRepository.findById(order.id))?.status).toBe("processing");
  });

  it("updateStatus solo hace CAS: no valida transiciones (responsabilidad del service)", async () => {
    const user = await createTestUser();
    const cancelled = await createTestOrder(user.id, [], { status: "cancelled" });

    const reverted = await orderRepository.updateStatus(cancelled.id, "cancelled", "pending");

    expect(reverted?.status).toBe("pending");
  });

  it("deleteById elimina la orden y devuelve boolean", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id, []);

    expect(await orderRepository.deleteById(order.id)).toBe(true);
    expect(await orderRepository.findById(order.id)).toBeNull();
    expect(await orderRepository.deleteById("invalid-id")).toBe(false);
  });
});
