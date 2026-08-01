import type { OfferData } from "../../../src/types";
import { PRODUCT_ID } from "./product.factory";

export const OFFER_ID = "64b0000000000000000000e1";

export const makeOffer = (overrides: Partial<OfferData> = {}): OfferData => ({
  id: OFFER_ID,
  productId: PRODUCT_ID,
  originalPrice: 100,
  discountPrice: 80,
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2026-12-31T00:00:00.000Z"),
  isActive: true,
  title: "Oferta de prueba",
  ...overrides,
});
