import brands from "../data/brands.data";
import type { Brand } from "../../../types";

export const findAll = (): Brand[] => {
  return brands;
};

export const findById = (id: string): Brand | null => {
  return brands.find((b) => b.id === id) || null;
};
