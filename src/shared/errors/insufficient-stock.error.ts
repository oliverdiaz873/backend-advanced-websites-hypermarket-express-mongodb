export class InsufficientStockError extends Error {
  statusCode: number;

  constructor(message = "Insufficient stock") {
    super(message);
    this.name = "InsufficientStockError";
    this.statusCode = 409;
  }
}
