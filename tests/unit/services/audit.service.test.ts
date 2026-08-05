import * as auditService from "../../../src/modules/audit/services/audit.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { makeAuditLog, AUDIT_LOG_ID } from "../factories/audit.factory";

jest.mock("../../../src/modules/audit/repositories/audit.repository", () =>
  require("../mocks/repositories").mockAuditRepository
);
jest.mock("../../../src/modules/users/repositories/user.repository", () => ({
  findById: jest.fn(),
}));

import { mockAuditRepository } from "../mocks/repositories";
import * as userRepository from "../../../src/modules/users/repositories/user.repository";

describe("audit.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPage", () => {
    it("aplica defaults: page 1, limit 20, sort createdAt desc, sin filtros", async () => {
      mockAuditRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });

      const result = await auditService.getPage({ page: Number.NaN, limit: Number.NaN });

      expect(mockAuditRepository.findPage).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        userId: undefined,
        action: undefined,
        resource: undefined,
        resourceId: undefined,
        q: undefined,
        from: undefined,
        to: undefined,
        sortOrder: "desc",
      });
      expect(result.items).toEqual([]);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 0, pages: 1 });
    });

    it("mapea entity/entityId a resource/resourceId (alias solo en la capa API)", async () => {
      mockAuditRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });

      await auditService.getPage({
        page: 1,
        limit: 10,
        userId: "u1",
        action: "LOGIN",
        entity: "inventory",
        entityId: "p1",
      });

      expect(mockAuditRepository.findPage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LOGIN",
          resource: "inventory",
          resourceId: "p1",
        })
      );
    });

    it("pasa el término de búsqueda q al repositorio", async () => {
      mockAuditRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });

      await auditService.getPage({ page: 1, limit: 20, q: "login" });

      expect(mockAuditRepository.findPage).toHaveBeenCalledWith(expect.objectContaining({ q: "login" }));
    });

    it("convierte from/to a Date: to date-only llega al final del día", async () => {
      mockAuditRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });

      await auditService.getPage({ page: 1, limit: 20, from: "2026-01-01", to: "2026-01-10" });

      const { from, to } = mockAuditRepository.findPage.mock.calls[0][0];
      expect(from).toBeInstanceOf(Date);
      expect(from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
      expect(to).toBeInstanceOf(Date);
      expect(to.toISOString()).toBe("2026-01-10T23:59:59.999Z");
    });

    it("respeta sortOrder asc", async () => {
      mockAuditRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });

      await auditService.getPage({ page: 1, limit: 20, sortOrder: "asc" });

      expect(mockAuditRepository.findPage).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: "asc" }));
    });
  });

  describe("getById", () => {
    it("devuelve el audit log cuando existe", async () => {
      const log = makeAuditLog();
      mockAuditRepository.find.mockResolvedValue(log);

      const result = await auditService.getById(AUDIT_LOG_ID);

      expect(mockAuditRepository.find).toHaveBeenCalledWith(AUDIT_LOG_ID);
      expect(result).toEqual(log);
    });

    it("lanza NotFoundError cuando no existe", async () => {
      mockAuditRepository.find.mockResolvedValue(null);

      await expect(auditService.getById(AUDIT_LOG_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe("log", () => {
    it("omite el registro cuando MongoDB no está conectado (unit: conexión por defecto en 0)", async () => {
      await auditService.log({ userId: "u1", action: "LOGIN", resource: "auth", success: true });

      expect(mockAuditRepository.create).not.toHaveBeenCalled();
      expect(userRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe("sanitizeDetails", () => {
    it("deja pasar details dentro del límite", () => {
      expect(auditService.sanitizeDetails({ operation: "increase", quantity: 5 })).toEqual({
        operation: "increase",
        quantity: 5,
      });
      expect(auditService.sanitizeDetails(undefined)).toBeUndefined();
      expect(auditService.sanitizeDetails(null)).toBeNull();
    });

    it("trunca details que superan el tamaño máximo con metadata", () => {
      const huge = { message: "x".repeat(10_000) };

      const result = auditService.sanitizeDetails(huge) as {
        truncated: boolean;
        message: string;
        originalSize: number;
      };

      expect(result.truncated).toBe(true);
      expect(result.message).toBe("Details truncated");
      expect(result.originalSize).toBeGreaterThan(10_000);
      expect(result.originalSize).toBeLessThan(10_000 + huge.message.length);
    });
  });
});