import config from "../../../src/config";
import { getStorageProvider, resetStorageProvider } from "../../../src/shared/storage/storage.factory";
import { LocalStorageProvider } from "../../../src/shared/storage/local.provider";

jest.mock("../../../src/shared/storage/r2.provider", () => ({
  R2StorageProvider: class R2StorageProviderMock {
    name = "s3";
  },
}));

describe("storage.factory", () => {
  let originalProvider: typeof config.storageProvider;

  beforeEach(() => {
    originalProvider = config.storageProvider;
  });

  afterEach(() => {
    config.storageProvider = originalProvider;
    resetStorageProvider();
  });

  it("devuelve el proveedor local cuando STORAGE_PROVIDER=local", () => {
    config.storageProvider = "local";
    expect(getStorageProvider()).toBeInstanceOf(LocalStorageProvider);
  });

  it("selecciona s3 (R2) cuando STORAGE_PROVIDER=s3", () => {
    config.storageProvider = "s3";
    expect(getStorageProvider()).toHaveProperty("name", "s3");
  });

  it("es un singleton", () => {
    config.storageProvider = "local";
    expect(getStorageProvider()).toBe(getStorageProvider());
  });

  it("resetStorageProvider fuerza una nueva instancia", () => {
    config.storageProvider = "local";
    const first = getStorageProvider();
    resetStorageProvider();
    expect(getStorageProvider()).not.toBe(first);
  });
});
