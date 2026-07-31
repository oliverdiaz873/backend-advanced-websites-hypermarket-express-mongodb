import * as addressRepository from "../repositories/address.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import type { Address } from "../../../types";

export const getAll = async (): Promise<Address[]> => {
  return addressRepository.findAll();
};

export const getById = async (id: string): Promise<Address> => {
  const address = await addressRepository.findById(id);
  if (!address) {
    throw new NotFoundError("Address not found");
  }
  return address;
};

export const getByUser = async (userId: string): Promise<Address[]> => {
  return addressRepository.findByUserId(userId);
};
