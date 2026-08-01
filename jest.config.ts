import type { Config } from "jest";

const coverageSources = ["src/**/*.ts", "!src/**/*.d.ts", "!src/server.ts"];

const coverageIgnores = ["/node_modules/", "/dist/", "/docs/", "/scripts/", "/tests/"];

const transform = {
  "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
};

const config: Config = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      rootDir: "<rootDir>",
      testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup/unit.setup.ts"],
      transform,
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
      clearMocks: true,
      collectCoverageFrom: coverageSources,
      coveragePathIgnorePatterns: coverageIgnores,
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      rootDir: "<rootDir>",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup/integration.setup.ts"],
      globalSetup: "<rootDir>/tests/setup/global-setup.ts",
      globalTeardown: "<rootDir>/tests/setup/global-teardown.ts",
      transform,
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
      clearMocks: true,
      testTimeout: 30000,
      collectCoverageFrom: coverageSources,
      coveragePathIgnorePatterns: coverageIgnores,
    },
  ],
  detectOpenHandles: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover", "html"],
};

export default config;
