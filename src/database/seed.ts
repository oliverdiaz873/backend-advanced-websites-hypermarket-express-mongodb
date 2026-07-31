import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import { CategoryModel } from "../modules/categories/models/category.model";
import { ProductModel } from "../modules/products/models/product.model";
import type { IProduct } from "../modules/products/models/product.model";
import { OfferModel } from "../modules/offers/models/offer.model";
import { InventoryModel } from "../modules/inventory/models/inventory.model";
import { UserModel } from "../modules/users/models/user.model";
import categoriesData from "../modules/categories/data/categories.data";
import productsData from "../modules/products/data/products.data";
import offersData from "../modules/offers/data/offers.data";

const SALT_ROUNDS = 10;

const buildSubcategoryMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const category of categoriesData) {
    for (const sub of category.subcategories) {
      map[sub.slug] = sub.name;
    }
  }
  return map;
};

const mapProduct = (raw: (typeof productsData)[number], subcategoryNames: Record<string, string>): IProduct => ({
  _id: raw.id,
  sku: `sku-${raw.id}`,
  name: raw.name,
  description: `Detalle de ${raw.name}`,
  price: raw.price,
  image: raw.image,
  categoryId: raw.category,
  category: {
    name: subcategoryNames[raw.category] || "Otros",
    slug: raw.category,
  },
  unit: raw.unit || undefined,
  unitQuantity: raw.unitQuantity || undefined,
  status: "active",
  isAvailable: true,
});

const seed = async (): Promise<void> => {
  await connectDB();

  const [categoriesCount, productsCount, offersCount, inventoryCount, usersCount] = await Promise.all([
    CategoryModel.countDocuments(),
    ProductModel.countDocuments(),
    OfferModel.countDocuments(),
    InventoryModel.countDocuments(),
    UserModel.countDocuments(),
  ]);

  const subcategoryNames = buildSubcategoryMap();

  if (categoriesCount === 0) {
    const categories = categoriesData.map((c) => ({
      _id: c.id,
      name: c.name,
      slug: c.slug,
      subcategories: c.subcategories,
    }));
    await CategoryModel.insertMany(categories);
    console.log(`[seed] Categorías insertadas: ${categories.length}`);
  } else {
    console.log(`[seed] Categorías ya existentes (${categoriesCount}), omitido`);
  }

  if (productsCount === 0) {
    const products = productsData.map((p) => mapProduct(p, subcategoryNames));
    await ProductModel.insertMany(products);
    console.log(`[seed] Productos insertados: ${products.length}`);
  } else {
    console.log(`[seed] Productos ya existentes (${productsCount}), omitido`);
  }

  if (offersCount === 0) {
    const offers = offersData.map((o) => ({
      productId: o.productId,
      originalPrice: o.originalPrice,
      discountPrice: o.discountPrice,
      startDate: o.startDate,
      isActive: o.isActive,
    }));
    await OfferModel.insertMany(offers);
    console.log(`[seed] Ofertas insertadas: ${offers.length}`);
  } else {
    console.log(`[seed] Ofertas ya existentes (${offersCount}), omitido`);
  }

  if (inventoryCount === 0) {
    const productIds = await ProductModel.find().select("_id");
    const inventory = productIds.map((p) => ({
      productId: p._id,
      stock: 100,
      reservedStock: 0,
      minStock: 10,
    }));
    await InventoryModel.insertMany(inventory);
    console.log(`[seed] Inventario insertado: ${inventory.length}`);
  } else {
    console.log(`[seed] Inventario ya existente (${inventoryCount}), omitido`);
  }

  if (usersCount === 0) {
    const hashedPassword = bcrypt.hashSync("123456", SALT_ROUNDS);
    const users = [
      { name: "Oliver Diaz", email: "oliver@email.com", password: hashedPassword, role: "admin" },
      { name: "Maria Garcia", email: "maria@email.com", password: hashedPassword, role: "customer" },
      { name: "Carlos Lopez", email: "carlos@email.com", password: hashedPassword, role: "customer" },
    ];
    await UserModel.insertMany(users);
    console.log(`[seed] Usuarios insertados: ${users.length}`);
  } else {
    console.log(`[seed] Usuarios ya existentes (${usersCount}), omitido`);
  }

  await mongoose.disconnect();
  console.log("[seed] Proceso completado");
};

seed().catch((error) => {
  console.error("[seed] Error:", error);
  process.exit(1);
});
