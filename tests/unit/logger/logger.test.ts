import { logger } from "../../../src/shared/logger/logger";
import { runWithRequestId } from "../../../src/shared/logger/request-context";

describe("shared/logger", () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const parse = (spy: jest.SpyInstance): Record<string, unknown> =>
    JSON.parse(spy.mock.calls[0][0] as string);

  it("info registra JSON estructurado con timestamp, level y message", () => {
    logger.info("server started", { port: 3000 });

    const entry = parse(logSpy);
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("server started");
    expect(entry.metadata).toEqual({ port: 3000 });
    expect(typeof entry.timestamp).toBe("string");
  });

  it("warn y error usan los canales correspondientes", () => {
    logger.warn("rate limited", { ip: "1.2.3.4" });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(parse(warnSpy).level).toBe("warn");

    logger.error("db down");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(parse(errorSpy).level).toBe("error");
  });

  it("no incluye metadata vacía", () => {
    logger.info("plain message");
    const entry = parse(logSpy);
    expect(entry.message).toBe("plain message");
    expect(entry.metadata).toBeUndefined();
  });

  it("propaga requestId desde el contexto AsyncLocalStorage", () => {
    runWithRequestId("req-123", () => {
      logger.info("inside request");
    });

    const entry = parse(logSpy);
    expect(entry.requestId).toBe("req-123");
  });

  it("no incluye requestId fuera del contexto de request", () => {
    logger.info("outside request");
    const entry = parse(logSpy);
    expect(entry.requestId).toBeUndefined();
  });
});