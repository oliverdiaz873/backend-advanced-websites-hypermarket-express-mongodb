import offers from "../data/offers.data";
import type { OfferData } from "../../../types";

export const findAll = (): OfferData[] => {
  return offers;
};
