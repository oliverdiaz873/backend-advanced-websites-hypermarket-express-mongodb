import * as brandRepository from "../repositories/brand.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import type { Brand } from "../../../types";

export const getAll = (): Brand[] => {
  return brandRepository.findAll();
};

export const getById = (id: string): Brand => {
  const brand = brandRepository.findById(id);
  if (!brand) {
    throw new NotFoundError("Brand not found");
  }
  return brand;
};
