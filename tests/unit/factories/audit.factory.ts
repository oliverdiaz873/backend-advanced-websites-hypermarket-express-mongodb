import type { AuditLog } from "../../../src/types";

export const AUDIT_LOG_ID = "64b00000000000000000002001";

export const makeAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: AUDIT_LOG_ID,
  userId: "64b00000000000000000000001",
  userName: "Oliver Diaz",
  action: "LOGIN",
  resource: "auth",
  resourceId: undefined,
  success: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});
