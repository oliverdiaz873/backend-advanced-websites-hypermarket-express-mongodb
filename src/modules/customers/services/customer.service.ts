import * as customerRepository from "../repositories/customer.repository";
import * as auditService from "../../audit/services/audit.service";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { EmailAlreadyExistsError } from "../../../shared/errors/email-already-exists.error";
import { CUSTOMER_SORT_FIELDS } from "../constants/customer-sort-fields";
import type {
  Customer,
  CustomerAddress,
  CustomerPageResult,
  CustomerSortField,
  CustomerStats,
  CustomerStatus,
} from "../../../types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const CUSTOMER_STATUSES: readonly CustomerStatus[] = ["active", "blocked", "pending"];
const ALLOWED_UPDATABLE = ["name", "email", "phone", "avatar", "address"] as const;

const toInt = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(value as string, 10);
  return Number.isFinite(n) ? n : fallback;
};

const refineStatus = (value: unknown): CustomerStatus | undefined => {
  if (typeof value === "string" && (CUSTOMER_STATUSES as readonly string[]).includes(value)) {
    return value as CustomerStatus;
  }
  return undefined;
};

const refineSortBy = (value: unknown): CustomerSortField | undefined => {
  if (typeof value === "string" && (CUSTOMER_SORT_FIELDS as readonly string[]).includes(value)) {
    return value as CustomerSortField;
  }
  return undefined;
};

export const getPage = async (query: Record<string, unknown>): Promise<CustomerPageResult> => {
  const page = Math.max(DEFAULT_PAGE, toInt(query.page, DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(query.limit, DEFAULT_LIMIT)));
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  const sortBy = refineSortBy(query.sortBy);
  const status = refineStatus(query.status);
  const q = typeof query.q === "string" && query.q.trim() ? query.q.trim() : undefined;

  return customerRepository.findPage({ page, limit, q, status, sortBy, sortOrder });
};

export const getById = async (id: string): Promise<Customer> => {
  const customer = await customerRepository.findById(id);
  if (!customer) throw new NotFoundError("Customer not found");
  return customer;
};

export const updateById = async (
  id: string,
  data: Record<string, unknown>,
  actorId?: string
): Promise<Customer> => {
  let updates: Record<string, unknown> = {};
  return auditService.runAudited(
    { userId: actorId, action: "UPDATE_USER", resource: "customer", resourceId: id },
    async () => {
      const existing = await customerRepository.findById(id);
      if (!existing) throw new NotFoundError("Customer not found");

      updates = {};
      for (const key of ALLOWED_UPDATABLE) {
        if (data[key] === undefined) continue;

        if (key === "email") {
          const email = String(data.email).toLowerCase().trim();
          if (!email) throw new InvalidDataError("Email is required");
          const found = await customerRepository.findByEmail(email);
          if (found && found.id !== id) throw new EmailAlreadyExistsError();
          updates.email = email;
        } else if (key === "address") {
          if (data.address !== null && typeof data.address !== "object") {
            throw new InvalidDataError("Invalid address");
          }
          updates.address = data.address as CustomerAddress | undefined;
        } else {
          updates[key] = data[key];
        }
      }

      const updated = await customerRepository.updateById(id, updates);
      if (!updated) throw new NotFoundError("Customer not found");
      return updated;
    },
    undefined,
    () => ({ fields: Object.keys(updates) })
  );
};

export const updateStatus = async (
  id: string,
  status: string,
  actorId?: string
): Promise<Customer> => {
  const next = refineStatus(status);
  if (!next) throw new InvalidDataError("Invalid customer status");

  return auditService.runAudited(
    { userId: actorId, action: "UPDATE_USER", resource: "customer", resourceId: id },
    async () => {
      const existing = await customerRepository.findById(id);
      if (!existing) throw new NotFoundError("Customer not found");

      const updated = await customerRepository.updateStatus(id, next);
      if (!updated) throw new NotFoundError("Customer not found");
      return updated;
    },
    undefined,
    () => ({ status: next })
  );
};

export const getStats = async (): Promise<CustomerStats> => {
  const [total, active, blocked, pending, newThisMonth] = await Promise.all([
    customerRepository.countAll(),
    customerRepository.countByStatus("active"),
    customerRepository.countByStatus("blocked"),
    customerRepository.countByStatus("pending"),
    customerRepository.countNewThisMonth(),
  ]);
  return { total, active, blocked, pending, newThisMonth };
};
