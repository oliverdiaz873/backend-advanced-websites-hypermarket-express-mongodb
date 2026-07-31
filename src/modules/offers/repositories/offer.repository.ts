import { OfferModel } from "../models/offer.model";
import type { OfferData } from "../../../types";

export const findAll = async (): Promise<OfferData[]> => {
  const docs = await OfferModel.find();
  return docs.map((doc) => doc.toJSON() as unknown as OfferData);
};
