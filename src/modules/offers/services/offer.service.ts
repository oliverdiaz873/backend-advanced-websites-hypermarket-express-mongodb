import * as offerRepository from "../repositories/offer.repository";
import * as productRepository from "../../products/repositories/product.repository";
import type { OfferResponse } from "../../../types";

export const getAll = (): OfferResponse[] => {
  const offers = offerRepository.findAll();

  return offers.map((offer) => {
    const product = productRepository.findById(offer.productId);
    if (!product) return null;

    const discountPercentage = offer.originalPrice
      ? Math.round(((offer.originalPrice - offer.discountPrice) / offer.originalPrice) * 100)
      : 0;

    const unitLabel = product.unit ? ` / ${product.unit}` : "";

    return {
      id: product.id,
      name: product.name,
      price: offer.discountPrice,
      originalPrice: offer.originalPrice,
      discountPrice: offer.discountPrice,
      discountPercentage,
      image: product.image,
      category: product.categoryId,
      unit: product.unit,
      unitQuantity: product.unitQuantity,
      priceLabel: `Precio: $${offer.discountPrice}${unitLabel}`
    };
  }).filter(Boolean) as OfferResponse[];
};
