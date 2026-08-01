import { OfferModel } from "../../../src/modules/offers/models/offer.model";
import type { OfferData } from "../../../src/types";

export const createTestOffer = async (
  productId: string,
  overrides: Partial<OfferData> = {}
): Promise<OfferData> => {
  const { id: _id, ...rest } = overrides;
  const offer = await OfferModel.create({
    productId,
    originalPrice: 100,
    discountPrice: 80,
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2026-12-31T00:00:00.000Z"),
    isActive: true,
    ...rest,
  });
  return offer.toJSON() as unknown as OfferData;
};
