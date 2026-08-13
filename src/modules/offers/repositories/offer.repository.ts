import { OfferModel } from "../models/offer.model";
import type { OfferData } from "../../../types";

export const findAll = async (): Promise<OfferData[]> => {
  const docs = await OfferModel.find();
  return docs.map((doc) => doc.toJSON() as unknown as OfferData);
};

export const findAllSorted = async (): Promise<OfferData[]> => {
  const docs = await OfferModel.find().sort({ createdAt: -1 });
  return docs.map((doc) => doc.toJSON() as unknown as OfferData);
};

export const findAllActive = async (now: Date): Promise<OfferData[]> => {
  const docs = await OfferModel.find({
    isActive: true,
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  });
  return docs.map((doc) => doc.toJSON() as unknown as OfferData);
};

export const findById = async (id: string): Promise<OfferData | null> => {
  const doc = await OfferModel.findById(id);
  return doc ? (doc.toJSON() as unknown as OfferData) : null;
};

/** Oferta activa vigente para un producto (la más reciente creada), o null. */
export const findActiveByProductId = async (productId: string, now: Date): Promise<OfferData | null> => {
  const doc = await OfferModel.findOne({
    productId,
    isActive: true,
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  }).sort({ createdAt: -1 });
  return doc ? (doc.toJSON() as unknown as OfferData) : null;
};

export const create = async (data: Omit<OfferData, "id">): Promise<OfferData> => {
  const doc = await OfferModel.create(data);
  return doc.toJSON() as unknown as OfferData;
};

export const updateById = async (
  id: string,
  updates: Record<string, unknown> & { updatedAt: Date }
): Promise<OfferData | null> => {
  const doc = await OfferModel.findByIdAndUpdate(id, updates, { returnDocument: "after" });
  return doc ? (doc.toJSON() as unknown as OfferData) : null;
};

export const deleteById = async (id: string): Promise<boolean> => {
  const result = await OfferModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
};
