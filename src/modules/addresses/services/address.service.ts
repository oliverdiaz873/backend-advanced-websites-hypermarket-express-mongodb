import * as addressRepository from "../repositories/address.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import type { Address } from "../../../types";

export const getAll = (): Address[] => {
  return addressRepository.findAll();
};

export const getById = (id: string): Address => {
  const address = addressRepository.findById(id);
  if (!address) {
    throw new NotFoundError("Address not found");
  }
  return address;
};

export const getByUser = (userId: string): Address[] => {
  return addressRepository.findByUserId(userId);
};
