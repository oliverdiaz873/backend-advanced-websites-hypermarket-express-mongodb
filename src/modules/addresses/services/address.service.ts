import * as addressRepository from "../repositories/address.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { ForbiddenError } from "../../../shared/errors/forbidden.error";
import type { Address } from "../../../types";

const EDITABLE_FIELDS = ["label", "street", "city", "state", "zipCode", "country", "reference"] as const;

const stringField = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new InvalidDataError(`${field} must be a string`);
  }
  return value;
};

export const getById = async (id: string, requesterId: string, role: string): Promise<Address> => {
  const address = await addressRepository.findById(id);
  if (!address || (address.userId !== requesterId && role !== "admin")) {
    throw new NotFoundError("Address not found");
  }
  return address;
};

export const getByUser = async (userId: string, requesterId: string, role: string): Promise<Address[]> => {
  if (userId !== requesterId && role !== "admin") {
    throw new ForbiddenError("Forbidden: insufficient permissions");
  }
  return addressRepository.findByUserId(userId);
};

export const create = async (userId: string, data: Record<string, unknown>): Promise<Address> => {
  if (data.isDefault !== undefined && typeof data.isDefault !== "boolean") {
    throw new InvalidDataError("isDefault must be a boolean");
  }

  const existing = await addressRepository.findByUserId(userId);
  const isDefault = existing.length === 0 || data.isDefault === true;

  const address = await addressRepository.create({
    userId,
    label: stringField(data.label, "label"),
    street: stringField(data.street, "street"),
    city: stringField(data.city, "city"),
    state: stringField(data.state, "state"),
    zipCode: stringField(data.zipCode, "zipCode"),
    country: stringField(data.country, "country"),
    reference: data.reference === undefined ? undefined : stringField(data.reference, "reference"),
    isDefault,
  });

  if (isDefault) {
    await addressRepository.setDefaultOnly(userId, address.id);
  }
  return address;
};

export const updateById = async (userId: string, id: string, data: Record<string, unknown>): Promise<Address> => {
  const address = await addressRepository.findById(id);
  if (!address || address.userId !== userId) {
    throw new NotFoundError("Address not found");
  }

  const updates: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) {
      updates[field] = stringField(data[field], field);
    }
  }
  if (data.isDefault !== undefined) {
    if (typeof data.isDefault !== "boolean") {
      throw new InvalidDataError("isDefault must be a boolean");
    }
    if (data.isDefault === true) {
      updates.isDefault = true;
    }
  }

  const updated = await addressRepository.updateById(id, updates);
  if (!updated) {
    throw new NotFoundError("Address not found");
  }
  if (updated.isDefault) {
    await addressRepository.setDefaultOnly(userId, updated.id);
  }
  return updated;
};

export const deleteById = async (userId: string, id: string): Promise<boolean> => {
  const address = await addressRepository.findById(id);
  if (!address || address.userId !== userId) {
    throw new NotFoundError("Address not found");
  }
  await addressRepository.deleteById(id);
  return true;
};
