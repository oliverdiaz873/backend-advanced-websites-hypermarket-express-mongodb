import * as inventoryRepository from "../repositories/inventory.repository";
import * as productRepository from "../../products/repositories/product.repository";
import * as inventoryMovementService from "../../inventory-movements/services/inventory-movement.service";
import * as auditService from "../../audit/services/audit.service";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { InsufficientStockError } from "../../../shared/errors/insufficient-stock.error";
import {
  INVENTORY_ADJUSTMENT_REASONS,
  type AdjustmentReason,
} from "../constants/inventory-adjustment-reasons";
import { INVENTORY_SORT_FIELDS } from "../constants/inventory-sort-fields";
import type {
  Inventory,
  InventoryAdjustInput,
  InventoryMovementType,
  InventoryPageResult,
  Product,
} from "../../../types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const toInt = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(value as string, 10);
  return Number.isFinite(n) ? n : fallback;
};

const refineReason = (value: unknown): AdjustmentReason | undefined => {
  if (typeof value === "string" && (INVENTORY_ADJUSTMENT_REASONS as readonly string[]).includes(value)) {
    return value as AdjustmentReason;
  }
  return undefined;
};

const refineSortBy = (value: unknown): import("../constants/inventory-sort-fields").InventorySortField | undefined => {
  if (typeof value === "string" && (INVENTORY_SORT_FIELDS as readonly string[]).includes(value)) {
    return value as import("../constants/inventory-sort-fields").InventorySortField;
  }
  return undefined;
};

export const getAll = async (): Promise<Inventory[]> => {
  return inventoryRepository.findAll();
};

export const getById = async (id: string): Promise<Inventory> => {
  const record = await inventoryRepository.findById(id);
  if (!record) {
    throw new NotFoundError("Inventory record not found");
  }
  return withStatus(record);
};

export const getByProductId = async (productId: string): Promise<Inventory> => {
  const record = await inventoryRepository.findByProductId(productId);
  if (!record) {
    throw new NotFoundError("Inventory not found");
  }
  return withStatus(record);
};

export const getLowStock = async (): Promise<Inventory[]> => {
  const records = await inventoryRepository.findLowStock();
  return records.map(withStatus);
};

export const getOutOfStock = async (): Promise<Inventory[]> => {
  const records = await inventoryRepository.findOutOfStock();
  return records.map(withStatus);
};

export const reserveStock = async (
  productId: string,
  quantity: number,
  orderId?: string,
  actorId?: string
): Promise<void> => {
  assertQuantity(quantity, 1);
  const record = await inventoryRepository.reserveStock(productId, quantity);
  if (!record) {
    throw new InsufficientStockError(`Insufficient stock for product ${productId}`);
  }
  await inventoryMovementService.record({
    inventoryId: record.id,
    productId,
    orderId,
    type: "reserve",
    quantity,
    previousStock: record.stock,
    newStock: record.stock,
    previousReservedStock: record.reservedStock - quantity,
    newReservedStock: record.reservedStock,
    reason: "order_reserved",
    createdBy: actorId,
  });

  void auditService.log({
    userId: actorId,
    action: "INVENTORY_RESERVE",
    resource: "inventory",
    resourceId: productId,
    success: true,
    details: { productId, quantity, orderId },
  });
};

export const reserveForOrder = async (
  items: Array<{ productId: string; quantity: number; name?: string }>,
  orderId?: string,
  actorId?: string
): Promise<void> => {
  if (items.length === 0) {
    return;
  }

  for (const item of items) {
    assertQuantity(item.quantity, 1);
  }

  const describeProduct = (item: { productId: string; name?: string }): string =>
    item.name ?? item.productId;

  const uniqueProductIds = Array.from(new Set(items.map((item) => item.productId)));
  const records = await inventoryRepository.findByIds(uniqueProductIds);
  const byProductId = new Map(records.map((record) => [record.productId, record]));

  for (const item of items) {
    const record = byProductId.get(item.productId);
    const available = record ? record.stock - record.reservedStock : 0;
    if (available < item.quantity) {
      throw new InsufficientStockError(`Insufficient stock for product ${describeProduct(item)}`);
    }
  }

  const reserved: Array<{ productId: string; quantity: number; record: Inventory }> = [];
  try {
    for (const item of items) {
      const record = await inventoryRepository.reserveStock(item.productId, item.quantity);
      if (!record) {
        throw new InsufficientStockError(`Insufficient stock for product ${describeProduct(item)}`);
      }
      await inventoryMovementService.record({
        inventoryId: record.id,
        productId: item.productId,
        orderId,
        type: "reserve",
        quantity: item.quantity,
        previousStock: record.stock,
        newStock: record.stock,
        previousReservedStock: record.reservedStock - item.quantity,
        newReservedStock: record.reservedStock,
        reason: "order_reserved",
        createdBy: actorId,
      });
      reserved.push({ productId: item.productId, quantity: item.quantity, record });
    }
  } catch (error) {
    for (const item of reserved) {
      await inventoryRepository
        .releaseReservation(item.productId, item.quantity)
        .catch(() => undefined);
    }
    throw error;
  }

  for (const item of items) {
    void auditService.log({
      userId: actorId,
      action: "INVENTORY_RESERVE",
      resource: "inventory",
      resourceId: item.productId,
      success: true,
      details: { productId: item.productId, quantity: item.quantity, orderId },
    });
  }
};

export const releaseReservation = async (
  productId: string,
  quantity: number,
  orderId?: string,
  actorId?: string
): Promise<void> => {
  assertQuantity(quantity, 1);
  const record = await inventoryRepository.releaseReservation(productId, quantity);
  if (!record) {
    throw new InsufficientStockError(`No reservation found for product ${productId}`);
  }
  await inventoryMovementService.record({
    inventoryId: record.id,
    productId,
    orderId,
    type: "release_reservation",
    quantity,
    previousStock: record.stock,
    newStock: record.stock,
    previousReservedStock: record.reservedStock + quantity,
    newReservedStock: record.reservedStock,
    reason: "order_release",
    createdBy: actorId,
  });

  void auditService.log({
    userId: actorId,
    action: "INVENTORY_RELEASE",
    resource: "inventory",
    resourceId: productId,
    success: true,
    details: { productId, quantity, orderId },
  });
};

export const completeReservation = async (
  productId: string,
  quantity: number,
  orderId?: string,
  actorId?: string
): Promise<void> => {
  assertQuantity(quantity, 1);
  const record = await inventoryRepository.completeReservation(productId, quantity);
  if (!record) {
    throw new InsufficientStockError(`No reservation found for product ${productId}`);
  }
  await inventoryMovementService.record({
    inventoryId: record.id,
    productId,
    orderId,
    type: "complete_sale",
    quantity,
    previousStock: record.stock + quantity,
    newStock: record.stock,
    previousReservedStock: record.reservedStock + quantity,
    newReservedStock: record.reservedStock,
    reason: "order_completed",
    createdBy: actorId,
  });

  void auditService.log({
    userId: actorId,
    action: "INVENTORY_COMPLETE_SALE",
    resource: "inventory",
    resourceId: productId,
    success: true,
    details: { productId, quantity, orderId },
  });
};

export const getPage = async (query: Record<string, unknown>): Promise<InventoryPageResult> => {
  const page = Math.max(DEFAULT_PAGE, toInt(query.page, DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(query.limit, DEFAULT_LIMIT)));
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  const sortBy = refineSortBy(query.sortBy);
  const status = query.status === "out-of-stock" || query.status === "low-stock" || query.status === "all" ? query.status : undefined;

  let productIds: string[] | undefined;
  if (typeof query.q === "string" && query.q.trim()) {
    productIds = await productRepository.findIdsByNameOrSku(query.q);
    if (productIds.length === 0) {
      return { items: [], total: 0, pagination: { page, limit, total: 0, pages: 1 } };
    }
  }

  const result = await inventoryRepository.findPage({
    page,
    limit,
    status,
    productIds,
    sortBy,
    sortOrder,
  });

  const items = await enrich(result.items);
  return { items, total: result.total, pagination: result.pagination };
};

export const createForProduct = async (data: {
  productId: string;
  stock?: number;
  minStock?: number;
}): Promise<Inventory> => {
  const record = await inventoryRepository.create(data);
  return withStatus(record);
};

export const removeByProductId = async (productId: string): Promise<void> => {
  await inventoryRepository.deleteByProductId(productId);
  await inventoryMovementService.removeByProductId(productId);
};

export const adjustInventory = async (
  id: string,
  input: InventoryAdjustInput,
  actorId?: string
): Promise<Inventory> => {
  const existing = await inventoryRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Inventory record not found");
  }

  const reason = refineReason(input.reason);
  if (!reason) {
    throw new InvalidDataError("Invalid adjustment reason");
  }

  let updated: Inventory | null;
  let type: InventoryMovementType;

  switch (input.operation) {
    case "increase":
      assertQuantity(input.quantity, 1);
      updated = await inventoryRepository.increaseById(id, input.quantity);
      type = "increase";
      break;
    case "decrease":
      assertQuantity(input.quantity, 1);
      updated = await inventoryRepository.decreaseById(id, input.quantity);
      if (!updated) {
        throw new InsufficientStockError("Insufficient stock for adjustment");
      }
      type = "decrease";
      break;
    case "set":
      assertQuantity(input.quantity, 0);
      updated = await inventoryRepository.setStockById(id, input.quantity);
      type = "set";
      break;
    default:
      throw new InvalidDataError("Invalid operation");
  }

  if (!updated) {
    throw new NotFoundError("Inventory record not found");
  }

  await inventoryMovementService.record({
    inventoryId: id,
    productId: existing.productId,
    type,
    quantity: input.quantity,
    previousStock: existing.stock,
    newStock: updated.stock,
    previousReservedStock: existing.reservedStock,
    newReservedStock: updated.reservedStock,
    reason,
    createdBy: actorId,
  });

  void auditService.log({
    userId: actorId,
    action: "INVENTORY_ADJUST",
    resource: "inventory",
    resourceId: id,
    success: true,
    details: { operation: input.operation, quantity: input.quantity, reason: input.reason },
  });

  return withStatus(updated);
};

export const changeMinStock = async (
  id: string,
  data: { minStock: number; reason?: AdjustmentReason },
  actorId?: string
): Promise<Inventory> => {
  const existing = await inventoryRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Inventory record not found");
  }

  if (!Number.isInteger(data.minStock) || data.minStock < 0) {
    throw new InvalidDataError("minStock must be a non-negative integer");
  }
  const reason = refineReason(data.reason);
  if (!reason) {
    throw new InvalidDataError("Invalid adjustment reason");
  }

  const updated = await inventoryRepository.setMinStockById(id, data.minStock);
  if (!updated) {
    throw new NotFoundError("Inventory record not found");
  }

  await inventoryMovementService.record({
    inventoryId: id,
    productId: existing.productId,
    type: "min_stock_change",
    quantity: 0,
    previousStock: updated.stock,
    newStock: updated.stock,
    previousReservedStock: updated.reservedStock,
    newReservedStock: updated.reservedStock,
    reason,
    createdBy: actorId,
  });

  return withStatus(updated);
};

const assertQuantity = (quantity: number, min: number): void => {
  if (!Number.isInteger(quantity) || quantity < min) {
    throw new InvalidDataError(
      min === 0 ? "Quantity must be a non-negative integer" : "Quantity must be a positive integer"
    );
  }
};

const withStatus = (record: Inventory): Inventory => ({
  ...record,
  status: inventoryRepository.deriveStatus(record),
});

const toSnapshot = (product: Product): Inventory["product"] => ({
  name: product.name,
  sku: product.sku,
  image: product.image,
  unit: product.unit,
});

const enrich = async (items: Inventory[]): Promise<Inventory[]> => {
  if (items.length === 0) return [];

  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const products = await productRepository.findByIds(productIds);
  const byId = new Map(products.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = byId.get(item.productId);
    return {
      ...item,
      ...(product ? { product: toSnapshot(product) } : {}),
      status: inventoryRepository.deriveStatus(item),
    };
  });
};
