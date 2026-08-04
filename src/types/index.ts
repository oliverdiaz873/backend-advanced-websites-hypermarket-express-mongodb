import type { ProductSortField } from "../modules/products/constants/product-sort-fields";
import type { AdjustmentReason } from "../modules/inventory/constants/inventory-adjustment-reasons";
import type { InventoryMovementType } from "../modules/inventory/constants/inventory-movement-types";
import type { InventorySortField } from "../modules/inventory/constants/inventory-sort-fields";
import type { InventoryStatus } from "../modules/inventory/constants/inventory-status";
import type { OrderSortField } from "../modules/orders/constants/order-sort-fields";

export type { AdjustmentReason } from "../modules/inventory/constants/inventory-adjustment-reasons";
export type { InventoryMovementType } from "../modules/inventory/constants/inventory-movement-types";
export type { InventorySortField } from "../modules/inventory/constants/inventory-sort-fields";
export type { InventoryStatus } from "../modules/inventory/constants/inventory-status";
export type { OrderSortField } from "../modules/orders/constants/order-sort-fields";


export type SortDirection = "asc" | "desc";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProductPageResult {
  items: Product[];
  total: number;
  pagination: PaginationMeta;
}

export interface ProductQuery {
  page: number;
  limit: number;
  q?: string;
  category?: string;
  brand?: string;
  status?: ProductStatus;
  sortBy?: ProductSortField;
  sortOrder?: SortDirection;
}

export type UserRole = "customer" | "admin";
export type ProductStatus = "active" | "inactive";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type BrandStatus = "active" | "inactive";
export type ContactMessageStatus = "pending" | "read" | "answered";

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface Config {
  port: number;
  nodeEnv: string;
  appVersion: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin: string[];
  mongodbUri?: string;
  mongodbBackupUri?: string;
  backupDir: string;
}

export type AuditAction =
  | "CREATE_PRODUCT"
  | "UPDATE_PRODUCT"
  | "DELETE_PRODUCT"
  | "CREATE_CATEGORY"
  | "UPDATE_CATEGORY"
  | "DELETE_CATEGORY"
  | "CREATE_BRAND"
  | "UPDATE_BRAND"
  | "DELETE_BRAND"
  | "CREATE_OFFER"
  | "UPDATE_OFFER"
  | "DELETE_OFFER"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER";

export interface AuditLog {
  id: string;
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  success: boolean;
  createdAt: Date;
}

export interface Subcategory {
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: BrandStatus;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  categoryId: string;
  category: {
    name: string;
    slug: string;
  };
  brandId?: string;
  brand?: {
    name: string;
    slug: string;
  };
  unit?: string;
  unitQuantity?: number;
  status: ProductStatus;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: string;
  productId: string;
  product?: InventoryProductSnapshot;
  stock: number;
  reservedStock: number;
  availableStock: number;
  minStock?: number;
  status?: InventoryStatus;
  updatedAt: Date;
}

export interface InventoryProductSnapshot {
  name: string;
  sku: string;
  image?: string;
  unit?: string;
}

export type InventoryStatusFilter = "all" | InventoryStatus;

export interface InventoryQuery {
  page: number;
  limit: number;
  q?: string;
  status?: InventoryStatusFilter;
  productIds?: string[];
  sortBy?: InventorySortField;
  sortOrder?: SortDirection;
}

export interface InventoryPageResult {
  items: Inventory[];
  total: number;
  pagination: PaginationMeta;
}

export type InventoryAdjustOperation = "increase" | "decrease" | "set";

export interface InventoryAdjustInput {
  operation: InventoryAdjustOperation;
  quantity: number;
  reason: AdjustmentReason;
  reference?: string;
}

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  productId: string;
  orderId?: string;
  type: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  previousReservedStock: number;
  newReservedStock: number;
  reason: AdjustmentReason;
  createdBy?: string;
  createdAt: Date;
}

export interface InventoryMovementQuery {
  page: number;
  limit: number;
  productId?: string;
  type?: InventoryMovementType;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  reference?: string;
  isDefault: boolean;
}

export interface OfferData {
  id: string;
  productId: string;
  originalPrice: number;
  discountPrice: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  title?: string;
}

export interface OfferResponse {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discountPrice: number;
  discountPercentage: number;
  image: string;
  category: string;
  unit?: string;
  unitQuantity?: number;
  priceLabel: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartResponse {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  changedAt: Date;
  by?: string;
  note?: string;
}

export interface OrderCustomerSnapshot {
  id: string;
  name: string;
  email: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  shippingAddress?: Omit<Address, "id" | "userId" | "isDefault">;
  totalItems: number;
  subtotal: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  statusHistory?: OrderStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderQuery {
  page: number;
  limit: number;
  q?: string;
  status?: OrderStatus;
  customerId?: string;
  sortBy?: OrderSortField;
  sortOrder?: SortDirection;
}

export interface OrderPageResult {
  items: Order[];
  total: number;
  pagination: PaginationMeta;
}

/** Orden administrada (dashboard): incluye snapshot del cliente. */
export type AdminOrder = Order & { customer?: OrderCustomerSnapshot };

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatsSummary {
  totalOrders: number;
  grossRevenue: number;
  averageOrderValue: number;
  completedOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  pendingContactMessages: number;
}

export interface StatsOrdersByStatus {
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  completed: number;
  cancelled: number;
}

export interface StatsGrossRevenue {
  today: number;
  week: number;
  month: number;
}

export interface StatsOverview {
  summary: StatsSummary;
  ordersByStatus: StatsOrdersByStatus;
  revenue: {
    gross: StatsGrossRevenue;
  };
}

