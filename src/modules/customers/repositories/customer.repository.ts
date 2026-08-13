import { UserModel } from "../../users/models/user.model";
import { isValidObjectId } from "../../../shared/utils/mongo";
import { CUSTOMER_SORT_FIELDS, type CustomerSortField } from "../constants/customer-sort-fields";
import type {
  Customer,
  CustomerPageResult,
  CustomerQuery,
  CustomerStatus,
  SortDirection,
} from "../../../types";

type CustomerDoc = InstanceType<typeof UserModel>;

const toCustomer = (doc: CustomerDoc): Customer => {
  const { password: _password, role: _role, ...customer } = doc.toJSON() as Customer & {
    password: string;
    role: "customer" | "admin";
  };
  return customer;
};

const buildSort = (
  sortBy: CustomerSortField | undefined,
  sortOrder: SortDirection
): Record<string, 1 | -1> => {
  if (!sortBy || !CUSTOMER_SORT_FIELDS.includes(sortBy)) {
    return { createdAt: -1 };
  }
  const direction: 1 | -1 = sortOrder === "asc" ? 1 : -1;
  return { [sortBy]: direction };
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const findPage = async (query: CustomerQuery): Promise<CustomerPageResult> => {
  const { page, limit, q, status, sortBy, sortOrder } = query;

  const filter: Record<string, unknown> = { role: "customer" };
  if (status === "active" || status === "blocked" || status === "pending") {
    filter.status = status;
  }
  if (q && q.trim()) {
    const term = escapeRegex(q.trim());
    filter.$or = [
      { name: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const sort = buildSort(sortBy, sortOrder ?? "desc");

  const [docs, total] = await Promise.all([
    UserModel.find(filter).sort(sort).skip(skip).limit(limit),
    UserModel.countDocuments(filter),
  ]);

  const items = docs.map(toCustomer);
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, pagination: { page, limit, total, pages } };
};

export const findById = async (id: string): Promise<Customer | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await UserModel.findOne({ _id: id, role: "customer" });
  return doc ? toCustomer(doc) : null;
};

export const findByEmail = async (email: string): Promise<Customer | null> => {
  const doc = await UserModel.findOne({ email: email.toLowerCase().trim() });
  return doc ? toCustomer(doc) : null;
};

export const updateById = async (
  id: string,
  data: Partial<Pick<Customer, "name" | "email" | "phone" | "avatar" | "address">>
): Promise<Customer | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await UserModel.findOneAndUpdate(
    { _id: id, role: "customer" },
    { $set: { ...data, updatedAt: new Date() } },
    { new: true }
  );
  return doc ? toCustomer(doc) : null;
};

export const updateStatus = async (id: string, status: CustomerStatus): Promise<Customer | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await UserModel.findOneAndUpdate(
    { _id: id, role: "customer" },
    { $set: { status, updatedAt: new Date() } },
    { new: true }
  );
  return doc ? toCustomer(doc) : null;
};

export const countAll = async (): Promise<number> => UserModel.countDocuments({ role: "customer" });

export const countByStatus = async (status: CustomerStatus): Promise<number> =>
  UserModel.countDocuments({ role: "customer", status });

export const countNewThisMonth = async (): Promise<number> => {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return UserModel.countDocuments({ role: "customer", createdAt: { $gte: startOfMonth } });
};
