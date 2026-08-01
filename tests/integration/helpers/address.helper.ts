import { AddressModel } from "../../../src/modules/addresses/models/address.model";
import type { Address } from "../../../src/types";

export const createTestAddress = async (
  userId: string,
  overrides: Partial<Address> = {}
): Promise<Address> => {
  const { id, ...rest } = overrides;
  const address = await AddressModel.create({
    userId,
    label: "Casa",
    street: "Av. Principal 123",
    city: "Lima",
    state: "Lima",
    zipCode: "15001",
    country: "Peru",
    isDefault: false,
    ...rest,
  });
  return address.toJSON() as unknown as Address;
};
