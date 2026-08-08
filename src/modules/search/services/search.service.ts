import * as productRepository from "../../products/repositories/product.repository";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { toPublicProduct, normalizeLang } from "../../products/presenters/product.presenter";
import type { PublicProduct } from "../../products/presenters/product.presenter";

export const search = async (
  query: string,
  category?: string,
  rawLang?: unknown
): Promise<PublicProduct[]> => {
  if (!query || !query.trim()) {
    throw new InvalidDataError("Search term is required");
  }

  const lang = normalizeLang(rawLang);
  const products = await productRepository.search(query, category);
  return products.map((product) => toPublicProduct(product, lang));
};