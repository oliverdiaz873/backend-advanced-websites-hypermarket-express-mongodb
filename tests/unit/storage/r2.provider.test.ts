import { R2StorageProvider } from "../../../src/shared/storage/r2.provider";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";

const mockGetSignedUrl = jest.fn();
const mockSend = jest.fn();

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: (...args: unknown[]) => mockSend(...args) })),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
  HeadObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
  DeleteObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
  ListObjectsV2Command: jest.fn().mockImplementation((input: unknown) => input),
  DeleteObjectsCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

describe("R2StorageProvider", () => {
  const provider = new R2StorageProvider({
    bucket: "images",
    publicUrl: "https://cdn.example.com/",
    accountId: "acct-123",
    accessKeyId: "key",
    secretAccessKey: "secret",
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("genera una presigned upload URL con la key definitiva", async () => {
    mockGetSignedUrl.mockResolvedValue("https://signed.example.com/upload");

    const res = await provider.getPresignedUploadUrl({
      key: "products/abc/original.webp",
      contentType: "image/webp",
      expiresInSeconds: 600,
    });

    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    expect(res.uploadUrl).toBe("https://signed.example.com/upload");
    expect(res.publicUrl).toBe("https://cdn.example.com/products/abc/original.webp");
    expect(res.expiresInSeconds).toBe(600);
  });

  it("getPublicUrl normaliza la base pública", () => {
    expect(provider.getPublicUrl("products/abc/original.webp")).toBe(
      "https://cdn.example.com/products/abc/original.webp"
    );
  });

  it("objectExists devuelve true si HEAD responde", async () => {
    mockSend.mockResolvedValue({});

    expect(await provider.objectExists("products/abc/original.webp")).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("objectExists devuelve false si HEAD falla", async () => {
    mockSend.mockRejectedValue(new Error("not found"));

    expect(await provider.objectExists("products/abc/original.webp")).toBe(false);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("deleteObject envía DeleteObjectCommand", async () => {
    mockSend.mockResolvedValue({});

    await provider.deleteObject("products/abc/original.webp");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("getPublicUrl rechaza keys inseguras", () => {
    expect(() => provider.getPublicUrl("../escape.png")).toThrow(InvalidDataError);
  });

  it("objectExists devuelve false sin llamar a S3 para keys inseguras", async () => {
    expect(await provider.objectExists("../escape.png")).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("deleteObject rechaza keys inseguras", async () => {
    await expect(provider.deleteObject("../escape.png")).rejects.toBeInstanceOf(InvalidDataError);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("listObjects pagina hasta el final", async () => {
    mockSend
      .mockResolvedValueOnce({
        Contents: [{ Key: "products/abc/a.webp", LastModified: new Date() }],
        IsTruncated: true,
        NextContinuationToken: "next-token",
      })
      .mockResolvedValueOnce({ Contents: [{ Key: "products/abc/b.webp", LastModified: new Date() }], IsTruncated: false });

    const objects = await provider.listObjects("products/abc/");

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(objects.map((o) => o.key)).toEqual(["products/abc/a.webp", "products/abc/b.webp"]);
  });

  it("listObjects rechaza prefijos inseguros", async () => {
    await expect(provider.listObjects("../products")).rejects.toBeInstanceOf(InvalidDataError);
    expect(mockSend).not.toHaveBeenCalled();
  });

it("deletePrefix rechaza prefijos inseguros", async () => {
    await expect(provider.deletePrefix("../products")).rejects.toBeInstanceOf(InvalidDataError);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("deletePrefix borra en lotes de 1000", async () => {
    const contents = Array.from({ length: 1001 }, (_, i) => ({
      Key: `products/abc/img-${i}.webp`,
      LastModified: new Date(),
    }));
    mockSend.mockResolvedValueOnce({ Contents: contents, IsTruncated: false }).mockResolvedValueOnce({}).mockResolvedValueOnce({});

    await provider.deletePrefix("products/abc");

    expect(mockSend).toHaveBeenCalledTimes(3);
  });
});
