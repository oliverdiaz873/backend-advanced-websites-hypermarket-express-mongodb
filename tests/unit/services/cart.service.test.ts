import * as cartService from "../../../src/modules/cart/services/cart.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { makeCart } from "../factories/cart.factory";
import { makeProduct, PRODUCT_ID } from "../factories/product.factory";
import { USER_ID } from "../factories/user.factory";

jest.mock("../../../src/modules/cart/repositories/cart.repository", () =>
  require("../mocks/repositories").mockCartRepository
);
jest.mock("../../../src/modules/products/repositories/product.repository", () =>
  require("../mocks/repositories").mockProductRepository
);

import { mockCartRepository, mockProductRepository } from "../mocks/repositories";

describe("cart.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCart", () => {
    it("retorna carrito con items resueltos, totalItems y subtotal", async () => {
      mockCartRepository.findByUserId.mockResolvedValue(makeCart());
      mockProductRepository.findById.mockResolvedValue(makeProduct());

      const result = await cartService.getCart(USER_ID);

      expect(mockCartRepository.findByUserId).toHaveBeenCalledWith(USER_ID);
      expect(mockCartRepository.createCart).not.toHaveBeenCalled();
      expect(result.items).toEqual([
        { productId: PRODUCT_ID, name: "Arroz 1kg", price: 89.5, image: "https://example.com/arroz.png", quantity: 2 },
      ]);
      expect(result.totalItems).toBe(2);
      expect(result.subtotal).toBe(179);
    });

    it("crea un carrito vacío si el usuario no tiene uno", async () => {
      mockCartRepository.findByUserId.mockResolvedValue(null);
      mockCartRepository.createCart.mockResolvedValue(makeCart());

      const result = await cartService.getCart(USER_ID);

      expect(mockCartRepository.createCart).toHaveBeenCalledWith(USER_ID);
      expect(result).toBeDefined();
    });

    it("omite items cuyo producto ya no existe", async () => {
      mockCartRepository.findByUserId.mockResolvedValue(
        makeCart({ items: [{ productId: PRODUCT_ID, quantity: 2 }, { productId: "inexistente", quantity: 1 }] })
      );
      mockProductRepository.findById.mockResolvedValue(null);

      const result = await cartService.getCart(USER_ID);

      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
      expect(result.subtotal).toBe(0);
    });
  });

  describe("addItem", () => {
    it("lanza InvalidDataError si la cantidad no es entera", async () => {
      await expect(cartService.addItem(USER_ID, PRODUCT_ID, 1.5)).rejects.toThrow(InvalidDataError);
      expect(mockCartRepository.findByUserId).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si la cantidad es menor a 1", async () => {
      await expect(cartService.addItem(USER_ID, PRODUCT_ID, 0)).rejects.toThrow(InvalidDataError);
      await expect(cartService.addItem(USER_ID, PRODUCT_ID, 0)).rejects.toThrow("Quantity must be a positive integer");
    });

    it("lanza NotFoundError si el producto no existe", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(cartService.addItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow(NotFoundError);
      await expect(cartService.addItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow("Product not found");
    });

    it("lanza InvalidDataError si el producto no está disponible", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct({ isAvailable: false }));

      await expect(cartService.addItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow(InvalidDataError);
      await expect(cartService.addItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow("Product is not available");
    });

    it("agrega el item y retorna el carrito actualizado", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockCartRepository.findByUserId.mockResolvedValueOnce(null).mockResolvedValue(makeCart());
      mockCartRepository.createCart.mockResolvedValue(makeCart());
      mockCartRepository.addItem.mockResolvedValue(true);

      const result = await cartService.addItem(USER_ID, PRODUCT_ID, 2);

      expect(mockCartRepository.createCart).toHaveBeenCalledWith(USER_ID);
      expect(mockCartRepository.addItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID, 2);
      expect(result.totalItems).toBe(2);
    });
  });

  describe("updateItem", () => {
    it("lanza InvalidDataError si la cantidad no es entera", async () => {
      await expect(cartService.updateItem(USER_ID, PRODUCT_ID, 2.5)).rejects.toThrow(InvalidDataError);
    });

    it("lanza NotFoundError si el producto no existe", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(cartService.updateItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow(NotFoundError);
    });

    it("lanza InvalidDataError si el producto no está disponible", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct({ isAvailable: false }));

      await expect(cartService.updateItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow(InvalidDataError);
    });

    it("lanza NotFoundError si el carrito no existe", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockCartRepository.findByUserId.mockResolvedValue(null);

      await expect(cartService.updateItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow(NotFoundError);
      await expect(cartService.updateItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow("Cart not found");
    });

    it("lanza NotFoundError si el item del carrito no existe", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockCartRepository.findByUserId.mockResolvedValue(makeCart());
      mockCartRepository.updateItem.mockResolvedValue(null);

      await expect(cartService.updateItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow(NotFoundError);
      await expect(cartService.updateItem(USER_ID, PRODUCT_ID, 1)).rejects.toThrow("Cart item not found");
    });

    it("actualiza el item y retorna el carrito", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockCartRepository.findByUserId.mockResolvedValue(makeCart());
      mockCartRepository.updateItem.mockResolvedValue(makeCart());

      const result = await cartService.updateItem(USER_ID, PRODUCT_ID, 3);

      expect(mockCartRepository.updateItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID, 3);
      expect(result.totalItems).toBe(2);
    });
  });

  describe("removeItem", () => {
    it("lanza NotFoundError si el carrito no existe", async () => {
      mockCartRepository.findByUserId.mockResolvedValue(null);

      await expect(cartService.removeItem(USER_ID, PRODUCT_ID)).rejects.toThrow(NotFoundError);
    });

    it("lanza NotFoundError si el item del carrito no existe", async () => {
      mockCartRepository.findByUserId.mockResolvedValue(makeCart());
      mockCartRepository.removeItem.mockResolvedValue(null);

      await expect(cartService.removeItem(USER_ID, PRODUCT_ID)).rejects.toThrow(NotFoundError);
    });

    it("elimina el item y retorna el carrito", async () => {
      mockCartRepository.findByUserId.mockResolvedValue(makeCart());
      mockCartRepository.removeItem.mockResolvedValue(makeCart());
      mockProductRepository.findById.mockResolvedValue(makeProduct());

      const result = await cartService.removeItem(USER_ID, PRODUCT_ID);

      expect(mockCartRepository.removeItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID);
      expect(result.totalItems).toBe(2);
    });
  });

  describe("clearCart", () => {
    it("limpia el carrito existente", async () => {
      mockCartRepository.findByUserId.mockResolvedValue(makeCart());
      mockCartRepository.clearCart.mockResolvedValue(true);
      mockProductRepository.findById.mockResolvedValue(makeProduct());

      const result = await cartService.clearCart(USER_ID);

      expect(mockCartRepository.clearCart).toHaveBeenCalledWith(USER_ID);
      expect(mockCartRepository.createCart).not.toHaveBeenCalled();
      expect(result.totalItems).toBe(2);
    });

    it("crea el carrito si el usuario no tiene uno y lo limpia", async () => {
      mockCartRepository.findByUserId.mockResolvedValueOnce(null).mockResolvedValue(makeCart());
      mockCartRepository.createCart.mockResolvedValue(makeCart());
      mockCartRepository.clearCart.mockResolvedValue(true);
      mockProductRepository.findById.mockResolvedValue(makeProduct());

      const result = await cartService.clearCart(USER_ID);

      expect(mockCartRepository.createCart).toHaveBeenCalledWith(USER_ID);
      expect(result.totalItems).toBe(2);
    });
  });
});
