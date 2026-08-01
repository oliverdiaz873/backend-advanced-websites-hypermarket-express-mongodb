import mongoose from "mongoose";
import { AuditLogModel } from "../../src/modules/audit/models/audit-log.model";
import { log, runAudited } from "../../src/modules/audit/services/audit.service";

describe("módulo audit", () => {
  afterEach(async () => {
    await AuditLogModel.deleteMany({});
  });

  describe("log", () => {
    it("registra un log exitoso en la colección auditlogs", async () => {
      await log({ userId: "u1", action: "CREATE_PRODUCT", resource: "product", resourceId: "p1", success: true });

      const doc = await AuditLogModel.findOne({ resourceId: "p1" });
      expect(doc).not.toBeNull();
      expect(doc?.action).toBe("CREATE_PRODUCT");
      expect(doc?.success).toBe(true);
      expect(doc?.userId).toBe("u1");
    });

    it("registra un log fallido", async () => {
      await log({ userId: "u1", action: "DELETE_USER", resource: "user", success: false });

      const doc = await AuditLogModel.findOne({ action: "DELETE_USER" });
      expect(doc).not.toBeNull();
      expect(doc?.success).toBe(false);
    });
  });

  describe("runAudited", () => {
    it("ejecuta la función, registra éxito y devuelve el resultado", async () => {
      const result = await runAudited(
        { userId: "u1", action: "CREATE_CATEGORY", resource: "category" },
        async () => ({ id: "c1", name: "Bebidas" }),
        (r) => r.id
      );

      expect(result).toEqual({ id: "c1", name: "Bebidas" });

      const doc = await AuditLogModel.findOne({ action: "CREATE_CATEGORY" });
      expect(doc?.success).toBe(true);
      expect(doc?.resourceId).toBe("c1");
    });

    it("registra fallo y re-lanza el error", async () => {
      const error = new Error("boom");
      await expect(
        runAudited(
          { userId: "u1", action: "UPDATE_OFFER", resource: "offer", resourceId: "o1" },
          async () => {
            throw error;
          }
        )
      ).rejects.toThrow("boom");

      const doc = await AuditLogModel.findOne({ action: "UPDATE_OFFER" });
      expect(doc?.success).toBe(false);
      expect(doc?.resourceId).toBe("o1");
    });
  });
});
