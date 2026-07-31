import mongoose from "mongoose";
import { connectDB } from "../config/database";
import { CategoryModel } from "../modules/categories/models/category.model";
import { ProductModel } from "../modules/products/models/product.model";
import { OfferModel } from "../modules/offers/models/offer.model";
import { InventoryModel } from "../modules/inventory/models/inventory.model";
import { UserModel } from "../modules/users/models/user.model";
import { BrandModel } from "../modules/brands/models/brand.model";
import { AddressModel } from "../modules/addresses/models/address.model";
import { CartModel } from "../modules/cart/models/cart.model";
import { OrderModel } from "../modules/orders/models/order.model";

interface ClearableModel {
  deleteMany(filter: object): PromiseLike<{ deletedCount?: number | null }>;
}

const clear = async (): Promise<void> => {
  await connectDB();

  const models: Array<{ name: string; model: ClearableModel }> = [
    { name: "users", model: UserModel },
    { name: "addresses", model: AddressModel },
    { name: "categories", model: CategoryModel },
    { name: "brands", model: BrandModel },
    { name: "products", model: ProductModel },
    { name: "inventory", model: InventoryModel },
    { name: "offers", model: OfferModel },
    { name: "carts", model: CartModel },
    { name: "orders", model: OrderModel },
  ];

  for (const { name, model } of models) {
    const result = await model.deleteMany({});
    console.log(`[clear] ${name}: ${result.deletedCount} documentos eliminados`);
  }

  await mongoose.disconnect();
  console.log("[clear] Base de datos vaciada");
};

clear().catch((error) => {
  console.error("[clear] Error:", error);
  process.exit(1);
});
