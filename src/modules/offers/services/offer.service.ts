import * as offerRepository from "../repositories/offer.repository";
import * as productRepository from "../../products/repositories/product.repository";
import * as auditService from "../../../modules/audit/services/audit.service";
import { normalizeLang, isPubliclyVisible, toPublicProduct } from "../../products/presenters/product.presenter";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import type { AdminOffer, OfferData, OfferResponse } from "../../../types";

export interface CreateOfferInput {
  productId: string;
  originalPrice: number;
  discountPrice: number;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  title?: string;
}

export interface UpdateOfferInput {
  productId?: string;
  originalPrice?: number;
  discountPrice?: number;
  startDate?: Date;
  endDate?: Date | null;
  isActive?: boolean;
  title?: string;
}

/** Listado admin: TODAS las ofertas (incluidas inactivas/expiradas), con el nombre del producto. */
export const listAll = async (): Promise<AdminOffer[]> => {
  const offers = await offerRepository.findAllSorted();
  const productIds = [...new Set(offers.map((offer) => offer.productId))];
  const products = await productRepository.findByIds(productIds);
  const nameByProduct = new Map(products.map((product) => [product.id, product.name]));

  return offers.map((offer) => ({
    ...offer,
    productName: nameByProduct.get(offer.productId) ?? "Producto eliminado",
  }));
};

export const getAll = async (rawLang?: unknown): Promise<OfferResponse[]> => {
  const lang = normalizeLang(rawLang);
  const offers = await offerRepository.findAllActive(new Date());

  const results = await Promise.all(
    offers.map(async (offer) => {
      const product = await productRepository.findById(offer.productId);
      if (!product || !isPubliclyVisible(product)) return null;

      const discountPercentage = offer.originalPrice
        ? Math.round(((offer.originalPrice - offer.discountPrice) / offer.originalPrice) * 100)
        : 0;

      const pub = toPublicProduct(product, lang);

      return {
        id: pub.id,
        name: pub.name,
        price: offer.discountPrice,
        originalPrice: offer.originalPrice,
        discountPrice: offer.discountPrice,
        discountPercentage,
        image: pub.image,
        categoryId: pub.categoryId,
        unit: pub.unit,
        unitQuantity: pub.unitQuantity,
      };
    })
  );

  return results.filter(Boolean) as OfferResponse[];
};

const parseDate = (value: Date | string | undefined): Date | null => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const validateDateRange = (startDate: Date, endDate: Date): void => {
  if (startDate.getTime() > endDate.getTime()) {
    throw new InvalidDataError("startDate must be before or equal to endDate");
  }
};

export const create = async (data: CreateOfferInput, actorId?: string): Promise<OfferData> => {
  return auditService.runAudited(
    { userId: actorId, action: "CREATE_OFFER", resource: "offer" },
    async () => {
      const product = await productRepository.findById(data.productId);
      if (!product) {
        throw new NotFoundError("Product not found");
      }

      if (data.originalPrice === undefined || !Number.isFinite(data.originalPrice) || data.originalPrice < 0) {
        throw new InvalidDataError("originalPrice must be a non-negative number");
      }
      if (data.discountPrice === undefined || !Number.isFinite(data.discountPrice) || data.discountPrice < 0) {
        throw new InvalidDataError("discountPrice must be a non-negative number");
      }
      if (data.discountPrice >= data.originalPrice) {
        throw new InvalidDataError("discountPrice must be less than originalPrice");
      }

      const startDate = parseDate(data.startDate) ?? new Date();
      const endDate = parseDate(data.endDate);
      if (endDate) {
        validateDateRange(startDate, endDate);
      }

      return offerRepository.create({
        productId: data.productId,
        originalPrice: data.originalPrice,
        discountPrice: data.discountPrice,
        startDate,
        endDate: endDate ?? undefined,
        isActive: data.isActive ?? true,
        title: data.title,
      });
    },
    (result) => result.id
  );
};

export const updateById = async (id: string, data: UpdateOfferInput, actorId?: string): Promise<OfferData> => {
  return auditService.runAudited(
    { userId: actorId, action: "UPDATE_OFFER", resource: "offer", resourceId: id },
    async () => {
      const existing = await offerRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Offer not found");
      }

      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };

      if (data.productId !== undefined) {
        const product = await productRepository.findById(data.productId);
        if (!product) {
          throw new NotFoundError("Product not found");
        }
        updates.productId = data.productId;
      }
      if (data.originalPrice !== undefined) {
        if (!Number.isFinite(data.originalPrice) || data.originalPrice < 0) {
          throw new InvalidDataError("originalPrice must be a non-negative number");
        }
        updates.originalPrice = data.originalPrice;
      }
      if (data.discountPrice !== undefined) {
        if (!Number.isFinite(data.discountPrice) || data.discountPrice < 0) {
          throw new InvalidDataError("discountPrice must be a non-negative number");
        }
        updates.discountPrice = data.discountPrice;
      }

      const originalPrice = (updates.originalPrice as number | undefined) ?? existing.originalPrice;
      const discountPrice = (updates.discountPrice as number | undefined) ?? existing.discountPrice;
      if (discountPrice >= originalPrice) {
        throw new InvalidDataError("discountPrice must be less than originalPrice");
      }

      if (data.startDate !== undefined) {
        const startDate = parseDate(data.startDate);
        if (!startDate) {
          throw new InvalidDataError("startDate must be a valid date");
        }
        updates.startDate = startDate;
      }
      if (data.endDate !== undefined) {
        if (data.endDate === null) {
          updates.endDate = null;
        } else {
          const endDate = parseDate(data.endDate);
          if (!endDate) {
            throw new InvalidDataError("endDate must be a valid date");
          }
          updates.endDate = endDate;
        }
      }

      const startDate = (updates.startDate as Date | undefined) ?? existing.startDate;
      const endDate = (updates.endDate as Date | null | undefined) ?? existing.endDate;
      if (endDate) {
        validateDateRange(startDate, endDate);
      }

      if (data.isActive !== undefined) updates.isActive = data.isActive;
      if (data.title !== undefined) updates.title = data.title;

      const updated = await offerRepository.updateById(id, updates);
      if (!updated) {
        throw new NotFoundError("Offer not found");
      }
      return updated;
    }
  );
};

export const remove = async (id: string, actorId?: string): Promise<void> => {
  return auditService.runAudited(
    { userId: actorId, action: "DELETE_OFFER", resource: "offer", resourceId: id },
    async () => {
      const existing = await offerRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Offer not found");
      }
      await offerRepository.deleteById(id);
    }
  );
};
