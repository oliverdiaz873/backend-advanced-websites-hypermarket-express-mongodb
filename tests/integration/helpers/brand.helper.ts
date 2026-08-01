import { BrandModel } from "../../../src/modules/brands/models/brand.model";
import type { Brand } from "../../../src/types";

const uniqueSuffix = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const createTestBrand = async (overrides: Partial<Brand> = {}): Promise<Brand> => {
  const { id, ...rest } = overrides;
  const suffix = uniqueSuffix();
  const brand = await BrandModel.create({
    _id: id ?? `br_${suffix}`,
    name: `Marca ${suffix}`,
    slug: `marca-${suffix}`,
    status: "active",
    ...rest,
  });
  return brand.toJSON() as unknown as Brand;
};
