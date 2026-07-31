import addresses from "../data/addresses.data";
import type { Address } from "../../../types";

export const findAll = (): Address[] => {
  return addresses;
};

export const findById = (id: string): Address | null => {
  return addresses.find((a) => a.id === id) || null;
};

export const findByUserId = (userId: string): Address[] => {
  return addresses.filter((a) => a.userId === userId);
};
