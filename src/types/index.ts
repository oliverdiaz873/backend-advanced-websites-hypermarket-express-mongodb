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
  isAvailable?: boolean;
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
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  storageProvider: "local" | "s3";
  storageLocalDir: string;
  storagePublicBaseUrl: string;
  uploadMaxSizeBytes: number;
  uploadPresignExpiresSeconds: number;
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2Bucket?: string;
  r2PublicUrl?: string;
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
  | "DELETE_USER"
  | "LOGIN"
  | "REGISTER"
  | "INVENTORY_ADJUST"
  | "INVENTORY_RESERVE"
  | "INVENTORY_RELEASE"
  | "INVENTORY_COMPLETE_SALE"
  | "CREATE_ORDER"
  | "UPDATE_ORDER_STATUS"
  | "CANCEL_ORDER";

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  success: boolean;
  details?: unknown;
  createdAt: Date;
}

export interface AuditLogQuery {
  page: number;
  limit: number;
  q?: string;
  userId?: string;
  action?: AuditAction;
  /** Alias de API para el campo físico `resource`. */
  entity?: string;
  /** Alias de API para el campo físico `resourceId`. */
  entityId?: string;
  from?: string;
  to?: string;
  sortBy?: "createdAt";
  sortOrder?: SortDirection;
}

export interface AuditLogPageResult {
  items: AuditLog[];
  total: number;
  pagination: PaginationMeta;
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

export interface ProductTranslation {
  name: string;
  description?: string;
}

export interface ProductTranslations {
  es?: ProductTranslation;
  en?: ProductTranslation;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  imageKey?: string;
  imageThumbnailKey?: string;
  translations?: ProductTranslations;
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

/** Query común reutilizada por todos los endpoints de estadísticas. */
export interface StatsQuery {
  /** Ventana relativa en días (fallback cuando no se envían from/to). */
  days?: number;
  /** Límite inferior de createdAt (ISO). Tiene prioridad sobre days. */
  from?: string;
  /** Límite superior de createdAt (ISO, incluido su día). */
  to?: string;
  /** Filtra ventas de una categoría (se resuelve a sus productos). */
  categoryId?: string;
  /** Filtra ventas de un producto concreto. */
  productId?: string;
  /** Reservado para crecimiento multi-store (sin efecto hoy). */
  storeId?: string;
  /** Top N (1-50) para top-products. */
  limit?: number;
}

/** Filtro resuelto, listo para aplicar a las agregaciones de MongoDB. */
export interface StatsFilter {
  from?: Date;
  to?: Date;
  /**
   * Ids de producto a filtrar. `undefined` = sin filtro de producto;
   * `[]` = sin coincidencias (resultado vacío), p.ej. categoría sin productos.
   */
  productIds?: string[];
}

export interface DashboardKpis {
  revenue: number;
  averageOrderValue: number;
  orders: number;
  completedOrders: number;
  pendingOrders: number;
  customers: number;
  newCustomers: number;
  lowStock: number;
  pendingContactMessages: number;
  growthPercent: number;
}

export interface RevenueTrendPoint {
  date: string;
  total: number;
}

export interface TopProductStat {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface CategorySalesStat {
  category: string;
  slug: string;
  revenue: number;
  orders: number;
}

export interface InventorySummary {
  inventoryValue: number;
  totalUnits: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
}

