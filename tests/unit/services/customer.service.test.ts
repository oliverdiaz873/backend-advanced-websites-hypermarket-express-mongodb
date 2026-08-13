import * as customerService from "../../../src/modules/customers/services/customer.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { EmailAlreadyExistsError } from "../../../src/shared/errors/email-already-exists.error";
import { CUSTOMER_ID, CUSTOMER_ID_2, makeCustomer, makeCustomerAddress, makeCustomerStats } from "../factories/customer.factory";

jest.mock("../../../src/modules/customers/repositories/customer.repository", () =>
  require("../mocks/repositories").mockCustomerRepository
);

import { mockCustomerRepository } from "../mocks/repositories";

describe("customer.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPage", () => {
    it("normaliza paginación, filtros y orden antes de delegar en el repositorio", async () => {
      mockCustomerRepository.findPage.mockResolvedValue({
        items: [makeCustomer()],
        total: 1,
        pagination: { page: 2, limit: 20, total: 1, pages: 1 },
      });

      const result = await customerService.getPage({
        page: "2",
        limit: "20",
        q: "  oliver  ",
        status: "blocked",
        sortBy: "email",
        sortOrder: "asc",
      });

      expect(mockCustomerRepository.findPage).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        q: "oliver",
        status: "blocked",
        sortBy: "email",
        sortOrder: "asc",
      });
      expect(result.items).toEqual([makeCustomer()]);
      expect(result.pagination.page).toBe(2);
    });

    it("descarta status inválido y sortBy desconocido con límites por defecto", async () => {
      mockCustomerRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });

      await customerService.getPage({ page: "0", limit: "999", status: "bogus", sortBy: "password" });

      expect(mockCustomerRepository.findPage).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
        q: undefined,
        status: undefined,
        sortBy: undefined,
        sortOrder: "desc",
      });
    });

    it("ignora q vacío", async () => {
      mockCustomerRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });

      await customerService.getPage({ q: "   " });

      expect(mockCustomerRepository.findPage).toHaveBeenCalledWith(
        expect.objectContaining({ q: undefined })
      );
    });
  });

  describe("getById", () => {
    it("retorna el cliente encontrado", async () => {
      mockCustomerRepository.findById.mockResolvedValue(makeCustomer());

      const result = await customerService.getById(CUSTOMER_ID);

      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(CUSTOMER_ID);
      expect(result).toEqual(makeCustomer());
    });

    it("lanza NotFoundError si no existe", async () => {
      mockCustomerRepository.findById.mockResolvedValue(null);

      await expect(customerService.getById(CUSTOMER_ID)).rejects.toThrow(NotFoundError);
      await expect(customerService.getById(CUSTOMER_ID)).rejects.toThrow("Customer not found");
    });
  });

  describe("updateById", () => {
    it("lanza NotFoundError si el cliente no existe", async () => {
      mockCustomerRepository.findById.mockResolvedValue(null);

      await expect(customerService.updateById(CUSTOMER_ID, { name: "Nuevo" })).rejects.toThrow(NotFoundError);
    });

    it("actualiza solo los campos permitidos y normaliza el email", async () => {
      const updated = makeCustomer({ name: "Nuevo", email: "nuevo@example.com", phone: "999" });
      mockCustomerRepository.findById.mockResolvedValue(makeCustomer());
      mockCustomerRepository.findByEmail.mockResolvedValue(null);
      mockCustomerRepository.updateById.mockResolvedValue(updated);

      const result = await customerService.updateById(CUSTOMER_ID, {
        name: "Nuevo",
        email: "  Nuevo@Example.COM  ",
        phone: "999",
        status: "blocked",
        role: "admin",
      });

      expect(mockCustomerRepository.findByEmail).toHaveBeenCalledWith("nuevo@example.com");
      expect(mockCustomerRepository.updateById).toHaveBeenCalledWith(CUSTOMER_ID, {
        name: "Nuevo",
        email: "nuevo@example.com",
        phone: "999",
      });
      expect(result).toEqual(updated);
    });

    it("actualiza el address cuando es un objeto", async () => {
      const address = makeCustomerAddress();
      const updated = makeCustomer({ address });
      mockCustomerRepository.findById.mockResolvedValue(makeCustomer());
      mockCustomerRepository.updateById.mockResolvedValue(updated);

      const result = await customerService.updateById(CUSTOMER_ID, { address });

      expect(mockCustomerRepository.updateById).toHaveBeenCalledWith(CUSTOMER_ID, { address });
      expect(result.address).toEqual(address);
    });

    it("limpia el address con null", async () => {
      const updated = makeCustomer();
      mockCustomerRepository.findById.mockResolvedValue(makeCustomer());
      mockCustomerRepository.updateById.mockResolvedValue(updated);

      await customerService.updateById(CUSTOMER_ID, { address: null });

      expect(mockCustomerRepository.updateById).toHaveBeenCalledWith(CUSTOMER_ID, { address: null });
    });

    it("lanza InvalidDataError si el address no es objeto ni null", async () => {
      mockCustomerRepository.findById.mockResolvedValue(makeCustomer());

      await expect(customerService.updateById(CUSTOMER_ID, { address: "calle" })).rejects.toThrow(InvalidDataError);
      expect(mockCustomerRepository.updateById).not.toHaveBeenCalled();
    });

    it("lanza EmailAlreadyExistsError si el email pertenece a otro cliente", async () => {
      mockCustomerRepository.findById.mockResolvedValue(makeCustomer());
      mockCustomerRepository.findByEmail.mockResolvedValue(makeCustomer({ id: CUSTOMER_ID_2 }));

      await expect(
        customerService.updateById(CUSTOMER_ID, { email: "duplicado@example.com" })
      ).rejects.toThrow(EmailAlreadyExistsError);
      expect(mockCustomerRepository.updateById).not.toHaveBeenCalled();
    });

    it("permite conservar el propio email sin lanzar conflicto", async () => {
      mockCustomerRepository.findById.mockResolvedValue(makeCustomer());
      mockCustomerRepository.findByEmail.mockResolvedValue(makeCustomer());
      mockCustomerRepository.updateById.mockResolvedValue(makeCustomer());

      const result = await customerService.updateById(CUSTOMER_ID, { email: "oliver@example.com" });

      expect(result).toBeDefined();
    });

    it("lanza InvalidDataError si el email queda vacío", async () => {
      mockCustomerRepository.findById.mockResolvedValue(makeCustomer());

      await expect(customerService.updateById(CUSTOMER_ID, { email: "   " })).rejects.toThrow(InvalidDataError);
    });
  });

  describe("updateStatus", () => {
    it("lanza InvalidDataError para un status inválido", async () => {
      await expect(customerService.updateStatus(CUSTOMER_ID, "bogus")).rejects.toThrow(InvalidDataError);
      expect(mockCustomerRepository.updateStatus).not.toHaveBeenCalled();
    });

    it("lanza NotFoundError si el cliente no existe", async () => {
      mockCustomerRepository.findById.mockResolvedValue(null);

      await expect(customerService.updateStatus(CUSTOMER_ID, "blocked")).rejects.toThrow(NotFoundError);
    });

    it("actualiza el status y retorna el cliente", async () => {
      const updated = makeCustomer({ status: "blocked" });
      mockCustomerRepository.findById.mockResolvedValue(makeCustomer());
      mockCustomerRepository.updateStatus.mockResolvedValue(updated);

      const result = await customerService.updateStatus(CUSTOMER_ID, "blocked", "64b000000000000000000001");

      expect(mockCustomerRepository.updateStatus).toHaveBeenCalledWith(CUSTOMER_ID, "blocked");
      expect(result.status).toBe("blocked");
    });
  });

  describe("getStats", () => {
    it("agrega los conteos por estado del repositorio", async () => {
      mockCustomerRepository.countAll.mockResolvedValue(10);
      mockCustomerRepository.countByStatus.mockResolvedValueOnce(8).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      mockCustomerRepository.countNewThisMonth.mockResolvedValue(2);

      const result = await customerService.getStats();

      expect(result).toEqual(makeCustomerStats());
      expect(mockCustomerRepository.countByStatus).toHaveBeenNthCalledWith(1, "active");
      expect(mockCustomerRepository.countByStatus).toHaveBeenNthCalledWith(2, "blocked");
      expect(mockCustomerRepository.countByStatus).toHaveBeenNthCalledWith(3, "pending");
    });
  });
});