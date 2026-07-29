export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface Config {
  port: number;
  nodeEnv: string;
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
  subcategories: Subcategory[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  unit?: string;
  unitQuantity?: number;
}

export interface OfferData {
  productId: string;
  oldPrice: string;
}

export interface OfferResponse {
  id: string;
  name: string;
  price: number;
  oldPrice: string;
  discountPercentage: number;
  image: string;
  category: string;
  unit?: string;
  unitQuantity?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CartResponse {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
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
  totalItems: number;
  subtotal: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}
