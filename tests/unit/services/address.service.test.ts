import * as addressService from "../../../src/modules/addresses/services/address.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { ForbiddenError } from "../../../src/shared/errors/forbidden.error";
import { makeAddress, ADDRESS_ID } from "../factories/address.factory";
import { USER_ID } from "../factories/user.factory";

jest.mock("../../../src/modules/addresses/repositories/address.repository", () =>
  require("../mocks/repositories").mockAddressRepository
);

import { mockAddressRepository } from "../mocks/repositories";

describe("address.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getById", () => {
    it("retorna la dirección si pertenece al usuario", async () => {
      const address = makeAddress();
      mockAddressRepository.findById.mockResolvedValue(address);

      const result = await addressService.getById(ADDRESS_ID, USER_ID, "customer");

      expect(mockAddressRepository.findById).toHaveBeenCalledWith(ADDRESS_ID);
      expect(result).toEqual(address);
    });

    it("lanza NotFoundError si la dirección no existe", async () => {
      mockAddressRepository.findById.mockResolvedValue(null);

      await expect(addressService.getById(ADDRESS_ID, USER_ID, "customer")).rejects.toThrow(NotFoundError);
    });

    it("lanza NotFoundError si la dirección es de otro usuario y no es admin", async () => {
      mockAddressRepository.findById.mockResolvedValue(makeAddress());

      await expect(addressService.getById(ADDRESS_ID, "otro-usuario", "customer")).rejects.toThrow(NotFoundError);
    });

    it("retorna la dirección de otro usuario si el rol es admin", async () => {
      const address = makeAddress();
      mockAddressRepository.findById.mockResolvedValue(address);

      const result = await addressService.getById(ADDRESS_ID, "otro-usuario", "admin");

      expect(result).toEqual(address);
    });
  });

  describe("getByUser", () => {
    it("retorna las direcciones del propio usuario", async () => {
      const addresses = [makeAddress()];
      mockAddressRepository.findByUserId.mockResolvedValue(addresses);

      const result = await addressService.getByUser(USER_ID, USER_ID, "customer");

      expect(mockAddressRepository.findByUserId).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(addresses);
    });

    it("lanza ForbiddenError si pide las direcciones de otro usuario sin ser admin", async () => {
      await expect(addressService.getByUser(USER_ID, "otro-usuario", "customer")).rejects.toThrow(ForbiddenError);
      await expect(addressService.getByUser(USER_ID, "otro-usuario", "customer")).rejects.toThrow(
        "Forbidden: insufficient permissions"
      );
      expect(mockAddressRepository.findByUserId).not.toHaveBeenCalled();
    });

    it("retorna las direcciones de otro usuario si es admin", async () => {
      const addresses = [makeAddress()];
      mockAddressRepository.findByUserId.mockResolvedValue(addresses);

      const result = await addressService.getByUser(USER_ID, "otro-usuario", "admin");

      expect(result).toEqual(addresses);
    });
  });

  describe("create", () => {
    it("lanza InvalidDataError si isDefault no es boolean", async () => {
      await expect(
        addressService.create(USER_ID, { label: "Casa", street: "Calle 1", city: "Lima", state: "Lima", zipCode: "15001", country: "Perú", isDefault: "yes" })
      ).rejects.toThrow(InvalidDataError);
      await expect(
        addressService.create(USER_ID, { label: "Casa", street: "Calle 1", city: "Lima", state: "Lima", zipCode: "15001", country: "Perú", isDefault: "yes" })
      ).rejects.toThrow("isDefault must be a boolean");
    });

    it("crea como default cuando el usuario no tiene direcciones", async () => {
      const address = makeAddress();
      mockAddressRepository.findByUserId.mockResolvedValue([]);
      mockAddressRepository.create.mockResolvedValue(address);
      mockAddressRepository.setDefaultOnly.mockResolvedValue(true);

      const result = await addressService.create(USER_ID, {
        label: "Casa", street: "Calle 1", city: "Lima", state: "Lima", zipCode: "15001", country: "Perú",
      });

      expect(mockAddressRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, isDefault: true })
      );
      expect(mockAddressRepository.setDefaultOnly).toHaveBeenCalledWith(USER_ID, address.id);
      expect(result).toEqual(address);
    });

    it("crea como NO default cuando ya existen direcciones y no pide isDefault", async () => {
      const address = makeAddress({ isDefault: false });
      mockAddressRepository.findByUserId.mockResolvedValue([makeAddress()]);
      mockAddressRepository.create.mockResolvedValue(address);

      const result = await addressService.create(USER_ID, {
        label: "Casa", street: "Calle 1", city: "Lima", state: "Lima", zipCode: "15001", country: "Perú",
      });

      expect(mockAddressRepository.create).toHaveBeenCalledWith(expect.objectContaining({ isDefault: false }));
      expect(mockAddressRepository.setDefaultOnly).not.toHaveBeenCalled();
      expect(result).toEqual(address);
    });

    it("crea como default y llama setDefaultOnly cuando isDefault es true", async () => {
      const address = makeAddress();
      mockAddressRepository.findByUserId.mockResolvedValue([makeAddress()]);
      mockAddressRepository.create.mockResolvedValue(address);
      mockAddressRepository.setDefaultOnly.mockResolvedValue(true);

      const result = await addressService.create(USER_ID, {
        label: "Casa", street: "Calle 1", city: "Lima", state: "Lima", zipCode: "15001", country: "Perú", isDefault: true,
      });

      expect(mockAddressRepository.setDefaultOnly).toHaveBeenCalledWith(USER_ID, address.id);
      expect(result).toEqual(address);
    });

    it("lanza InvalidDataError si un campo obligatorio no es string", async () => {
      mockAddressRepository.findByUserId.mockResolvedValue([]);

      await expect(
        addressService.create(USER_ID, { label: 123, street: "Calle 1", city: "Lima", state: "Lima", zipCode: "15001", country: "Perú" })
      ).rejects.toThrow(InvalidDataError);
      await expect(
        addressService.create(USER_ID, { label: 123, street: "Calle 1", city: "Lima", state: "Lima", zipCode: "15001", country: "Perú" })
      ).rejects.toThrow("label must be a string");
    });
  });

  describe("updateById", () => {
    it("lanza NotFoundError si la dirección no existe", async () => {
      mockAddressRepository.findById.mockResolvedValue(null);

      await expect(addressService.updateById(USER_ID, ADDRESS_ID, { label: "Trabajo" })).rejects.toThrow(NotFoundError);
    });

    it("lanza NotFoundError si la dirección es de otro usuario", async () => {
      mockAddressRepository.findById.mockResolvedValue(makeAddress());

      await expect(addressService.updateById("otro-usuario", ADDRESS_ID, { label: "Trabajo" })).rejects.toThrow(
        NotFoundError
      );
    });

    it("lanza InvalidDataError si un campo editable no es string", async () => {
      mockAddressRepository.findById.mockResolvedValue(makeAddress());

      await expect(addressService.updateById(USER_ID, ADDRESS_ID, { street: 42 })).rejects.toThrow(InvalidDataError);
      await expect(addressService.updateById(USER_ID, ADDRESS_ID, { street: 42 })).rejects.toThrow(
        "street must be a string"
      );
    });

    it("lanza InvalidDataError si isDefault no es boolean", async () => {
      mockAddressRepository.findById.mockResolvedValue(makeAddress());

      await expect(addressService.updateById(USER_ID, ADDRESS_ID, { isDefault: 1 })).rejects.toThrow(InvalidDataError);
    });

    it("actualiza los campos editables sin tocar default", async () => {
      const updated = makeAddress({ label: "Trabajo", street: "Av. Nueva 456", isDefault: false });
      mockAddressRepository.findById.mockResolvedValue(makeAddress());
      mockAddressRepository.updateById.mockResolvedValue(updated);

      const result = await addressService.updateById(USER_ID, ADDRESS_ID, { label: "Trabajo", street: "Av. Nueva 456" });

      expect(mockAddressRepository.updateById).toHaveBeenCalledWith(ADDRESS_ID, { label: "Trabajo", street: "Av. Nueva 456" });
      expect(mockAddressRepository.setDefaultOnly).not.toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it("llama setDefaultOnly cuando isDefault es true", async () => {
      const updated = makeAddress({ isDefault: true });
      mockAddressRepository.findById.mockResolvedValue(makeAddress({ isDefault: false }));
      mockAddressRepository.updateById.mockResolvedValue(updated);
      mockAddressRepository.setDefaultOnly.mockResolvedValue(true);

      await addressService.updateById(USER_ID, ADDRESS_ID, { isDefault: true });

      expect(mockAddressRepository.setDefaultOnly).toHaveBeenCalledWith(USER_ID, ADDRESS_ID);
    });
  });

  describe("deleteById", () => {
    it("lanza NotFoundError si la dirección no existe", async () => {
      mockAddressRepository.findById.mockResolvedValue(null);

      await expect(addressService.deleteById(USER_ID, ADDRESS_ID)).rejects.toThrow(NotFoundError);
    });

    it("lanza NotFoundError si la dirección es de otro usuario", async () => {
      mockAddressRepository.findById.mockResolvedValue(makeAddress());

      await expect(addressService.deleteById("otro-usuario", ADDRESS_ID)).rejects.toThrow(NotFoundError);
      expect(mockAddressRepository.deleteById).not.toHaveBeenCalled();
    });

    it("elimina la dirección y retorna true", async () => {
      mockAddressRepository.findById.mockResolvedValue(makeAddress());
      mockAddressRepository.deleteById.mockResolvedValue(true);

      const result = await addressService.deleteById(USER_ID, ADDRESS_ID);

      expect(mockAddressRepository.deleteById).toHaveBeenCalledWith(ADDRESS_ID);
      expect(result).toBe(true);
    });
  });
});
