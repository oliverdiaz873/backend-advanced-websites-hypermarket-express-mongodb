import { mapError } from "../../../src/shared/errors/error-map";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { UnauthorizedError } from "../../../src/shared/errors/unauthorized.error";
import { ForbiddenError } from "../../../src/shared/errors/forbidden.error";
import { ConflictError } from "../../../src/shared/errors/conflict.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { EmailAlreadyExistsError } from "../../../src/shared/errors/email-already-exists.error";
import { InsufficientStockError } from "../../../src/shared/errors/insufficient-stock.error";

const makeError = (name: string, message = "boom", statusCode?: number) => {
  const err = new Error(message) as Error & { statusCode?: number };
  err.name = name;
  if (statusCode !== undefined) err.statusCode = statusCode;
  return err;
};

describe("mapError", () => {
  it("mapea mongoose ValidationError a VALIDATION_ERROR 400", () => {
    const err = makeError("ValidationError");
    Object.assign(err, {
      errors: { name: { message: "name is required" }, email: { message: "email is invalid" } },
    });
    expect(mapError(err)).toEqual({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "name is required, email is invalid",
    });
  });

  it("mapea CastError a VALIDATION_ERROR 400", () => {
    expect(mapError(makeError("CastError"))).toEqual({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid identifier format",
    });
  });

  it("mapea MongoServerError 11000 a CONFLICT 409", () => {
    const err = makeError("MongoServerError");
    Object.assign(err, { code: 11000 });
    expect(mapError(err)).toHaveProperty("code", "CONFLICT");
    expect(mapError(err)).toHaveProperty("statusCode", 409);
  });

  it("mapea los errores de dominio del proyecto", () => {
    expect(mapError(new NotFoundError())).toEqual({ statusCode: 404, code: "NOT_FOUND", message: "Resource not found" });
    expect(mapError(new UnauthorizedError())).toEqual({ statusCode: 401, code: "UNAUTHORIZED", message: "Unauthorized" });
    expect(mapError(new ForbiddenError())).toEqual({ statusCode: 403, code: "FORBIDDEN", message: "Forbidden" });
    expect(mapError(new InvalidDataError("nope"))).toEqual({ statusCode: 400, code: "VALIDATION_ERROR", message: "nope" });
    expect(mapError(new ConflictError())).toEqual({ statusCode: 409, code: "CONFLICT", message: "Resource already exists" });
    expect(mapError(new EmailAlreadyExistsError())).toEqual({ statusCode: 409, code: "CONFLICT", message: "Email already exists" });
    expect(mapError(new InsufficientStockError("low"))).toEqual({ statusCode: 409, code: "CONFLICT", message: "low" });
  });

  it("mapea errores desconocidos a INTERNAL_ERROR 500 sin filtrar detalles", () => {
    const err = makeError("RandomError", "something broke internally");
    expect(mapError(err)).toEqual({ statusCode: 500, code: "INTERNAL_ERROR", message: "Internal server error" });
  });
});