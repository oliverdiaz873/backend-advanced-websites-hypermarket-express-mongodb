import config from "../../../src/config";
import { createPresignedUpload } from "../../../src/modules/uploads/services/upload.service";
import { getStorageProvider } from "../../../src/shared/storage/storage.factory";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";

jest.mock("../../../src/shared/storage/storage.factory", () => ({
  getStorageProvider: jest.fn(),
}));

const getStorageProviderMock = getStorageProvider as jest.Mock;

const providerMock = {
  name: "local",
  getPresignedUploadUrl: jest.fn(),
  getPublicUrl: jest.fn(),
  objectExists: jest.fn(),
  inspectImage: jest.fn(),
  listObjects: jest.fn(),
  deleteObject: jest.fn(),
  deletePrefix: jest.fn(),
};

describe("upload.service (presigned)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getStorageProviderMock.mockReturnValue(providerMock);
    providerMock.getPresignedUploadUrl.mockResolvedValue({
      uploadUrl: "https://signed.example.com/upload",
      publicUrl: "https://cdn.example.com/file.webp",
      expiresInSeconds: config.uploadPresignExpiresSeconds,
    });
  });

  it("crea una presigned URL para un producto con key versionada", async () => {
    const result = await createPresignedUpload({
      productId: "8f3a-1234",
      fileName: "coca.webp",
      contentType: "image/webp",
      purpose: "product",
    });

    expect(result.key).toMatch(/^products\/8f3a-1234\/[0-9a-f-]{36}\.webp$/);
    expect(result.productId).toBe("8f3a-1234");
    expect(result.purpose).toBe("product");
    expect(providerMock.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        key: result.key,
        contentType: "image/webp",
        expiresInSeconds: config.uploadPresignExpiresSeconds,
      })
    );
    expect(result.uploadUrl).toBe("https://signed.example.com/upload");
  });

  it("requiere productId cuando purpose=product", async () => {
    await expect(
      createPresignedUpload({ fileName: "coca.webp", contentType: "image/webp", purpose: "product" })
    ).rejects.toBeInstanceOf(InvalidDataError);
    expect(providerMock.getPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it("no requiere productId para purpose=pending y genera key bajo pending/", async () => {
    const result = await createPresignedUpload({
      fileName: "borrador.webp",
      contentType: "image/webp",
      purpose: "pending",
    });

    expect(result.key).toMatch(/^pending\/[0-9a-f-]{36}\.webp$/);
    expect(result.productId).toBeUndefined();
    expect(result.purpose).toBe("pending");
  });

  it("trata purposes desconocidos como product (requiere productId)", async () => {
    await expect(
      createPresignedUpload({ fileName: "a.webp", contentType: "image/webp", purpose: "misc" })
    ).rejects.toThrow(InvalidDataError);
  });

  it("rechaza tipos de contenido no permitidos", async () => {
    await expect(
      createPresignedUpload({ productId: "8f3a", fileName: "a.html", contentType: "text/html" })
    ).rejects.toThrow(InvalidDataError);
  });

  it("rechaza una extensión que no coincide con el MIME", async () => {
    await expect(
      createPresignedUpload({ productId: "8f3a", fileName: "a.png", contentType: "image/webp" })
    ).rejects.toThrow(InvalidDataError);
  });

  it("rechaza un fileName vacío", async () => {
    await expect(
      createPresignedUpload({ productId: "8f3a", fileName: "  ", contentType: "image/webp" })
    ).rejects.toThrow(InvalidDataError);
  });
});