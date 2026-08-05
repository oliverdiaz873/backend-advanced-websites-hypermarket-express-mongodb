import { AuditLogModel } from "../../../src/modules/audit/models/audit-log.model";
import * as auditRepository from "../../../src/modules/audit/repositories/audit.repository";

const createLog = (data: Record<string, unknown>) =>
  AuditLogModel.create({
    userId: "64b00000000000000000000001",
    userName: "Oliver Diaz",
    action: "LOGIN",
    resource: "auth",
    success: true,
    ...data,
  } as never);

describe("audit.repository (Mongo real)", () => {
  it("create persiste userName y details", async () => {
    const log = await auditRepository.create({
      userId: "64b00000000000000000000001",
      userName: "Oliver Diaz",
      action: "CREATE_ORDER",
      resource: "order",
      resourceId: "64b00000000000000000001001",
      success: true,
      details: { subtotal: 179 },
    });

    const doc = await AuditLogModel.findById(log.id);
    expect(doc?.userName).toBe("Oliver Diaz");
    expect(doc?.details).toEqual({ subtotal: 179 });
  });

  it("findPage pagina y ordena por createdAt desc por defecto", async () => {
    await createLog({ createdAt: new Date("2026-01-01T00:00:00.000Z"), action: "LOGIN" });
    await createLog({ createdAt: new Date("2026-03-01T00:00:00.000Z"), action: "REGISTER" });
    await createLog({ createdAt: new Date("2026-02-01T00:00:00.000Z"), action: "LOGIN" });

    const result = await auditRepository.findPage({ page: 1, limit: 2, sortOrder: "desc" });

    expect(result.total).toBe(3);
    expect(result.pagination.pages).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].action).toBe("REGISTER");
    expect(result.items[1].action).toBe("LOGIN");
  });

  it("findPage filtra por userId, action, resource y resourceId", async () => {
    await createLog({ action: "LOGIN", resource: "auth" });
    await createLog({ action: "UPDATE_ORDER_STATUS", resource: "order", resourceId: "o1" });

    const byAction = await auditRepository.findPage({ page: 1, limit: 10, action: "LOGIN" });
    expect(byAction.total).toBe(1);
    expect(byAction.items[0].action).toBe("LOGIN");

    const byResource = await auditRepository.findPage({ page: 1, limit: 10, resource: "order" });
    expect(byResource.total).toBe(1);

    const byResourceId = await auditRepository.findPage({ page: 1, limit: 10, resourceId: "o1" });
    expect(byResourceId.total).toBe(1);

    const byUser = await auditRepository.findPage({ page: 1, limit: 10, userId: "64b00000000000000000000001" });
    expect(byUser.total).toBe(2);
  });

  it("findPage filtra por rango de fechas from/to", async () => {
    await createLog({ createdAt: new Date("2026-01-05T00:00:00.000Z"), action: "LOGIN" });
    await createLog({ createdAt: new Date("2026-01-15T00:00:00.000Z"), action: "LOGIN" });
    await createLog({ createdAt: new Date("2026-02-01T00:00:00.000Z"), action: "LOGIN" });

    const result = await auditRepository.findPage({
      page: 1,
      limit: 10,
      from: new Date("2026-01-10T00:00:00.000Z"),
      to: new Date("2026-01-31T23:59:59.999Z"),
    });

    expect(result.total).toBe(1);
    expect(result.items[0].createdAt.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("findPage busca q con regex sobre resourceId, userName y action", async () => {
    await createLog({ action: "LOGIN", userName: "Ana Perez" });
    await createLog({ action: "INVENTORY_ADJUST", resource: "inventory", resourceId: "prod_123" });

    const byAction = await auditRepository.findPage({ page: 1, limit: 10, q: "login" });
    expect(byAction.total).toBe(1);
    expect(byAction.items[0].action).toBe("LOGIN");

    const byName = await auditRepository.findPage({ page: 1, limit: 10, q: "perez" });
    expect(byName.total).toBe(1);

    const byResourceId = await auditRepository.findPage({ page: 1, limit: 10, q: "prod_123" });
    expect(byResourceId.total).toBe(1);
    expect(byResourceId.items[0].resourceId).toBe("prod_123");
  });

  it("find devuelve el log y null con id inválido", async () => {
    const log = await createLog({ action: "LOGIN" });

    expect((await auditRepository.find(log.id))?.id).toBe(log.id);
    expect(await auditRepository.find("invalid-id")).toBeNull();
  });
});
