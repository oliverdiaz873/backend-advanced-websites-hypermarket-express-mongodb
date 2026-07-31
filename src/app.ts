import express, { Request, Response } from "express";
import cors from "cors";
import config from "./config";
import productRoutes from "./modules/products/routes/product.routes";
import categoryRoutes from "./modules/categories/routes/category.routes";
import offerRoutes from "./modules/offers/routes/offer.routes";
import searchRoutes from "./modules/search/routes/search.routes";
import userRoutes from "./modules/users/routes/user.routes";
import authRoutes from "./modules/auth/routes/auth.routes";
import cartRoutes from "./modules/cart/routes/cart.routes";
import orderRoutes from "./modules/orders/routes/order.routes";
import brandRoutes from "./modules/brands/routes/brand.routes";
import addressRoutes from "./modules/addresses/routes/address.routes";
import inventoryRoutes from "./modules/inventory/routes/inventory.routes";
import contactRoutes from "./modules/contact/routes/contact.routes";
import errorHandler from "./shared/middleware/error-handler";
import logger from "./shared/middleware/logger.middleware";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);
app.use(cors({
  origin: config.corsOrigin,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
}));

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/contact", contactRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    statusCode: 404,
  });
});

app.use(errorHandler);

export default app;
