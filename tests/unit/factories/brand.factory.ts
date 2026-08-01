import type { Brand } from "../../../src/types";

export const BRAND_ID = "br_coca_cola";

export const makeBrand = (overrides: Partial<Brand> = {}): Brand => ({
  id: BRAND_ID,
  name: "Coca-Cola",
  slug: "coca-cola",
  status: "active",
  ...overrides,
});
