import { CategoryModel } from "../../../src/modules/categories/models/category.model";
import type { Category } from "../../../src/types";

const uniqueSuffix = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const createTestCategory = async (overrides: Partial<Category> = {}): Promise<Category> => {
  const { id, ...rest } = overrides;
  const suffix = uniqueSuffix();
  const category = await CategoryModel.create({
    _id: id ?? `cat_${suffix}`,
    name: `Categoria ${suffix}`,
    slug: `categoria-${suffix}`,
    subcategories: [],
    ...rest,
  });
  return category.toJSON() as unknown as Category;
};
