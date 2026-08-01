export class ConflictError extends Error {
  statusCode: number;

  constructor(message = "Resource already exists") {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}
