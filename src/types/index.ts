export type UserRole = "customer" | "admin";
export type ProductStatus = "active" | "inactive";
export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";
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
  stock: number;
  reservedStock: number;
  availableStock: number;
  minStock?: number;
  updatedAt: Date;
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

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  shippingAddress?: Omit<Address, "id" | "userId" | "isDefault">;
  totalItems: number;
  subtotal: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

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

