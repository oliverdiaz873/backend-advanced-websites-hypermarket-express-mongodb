export class InvalidDataError extends Error {
  statusCode: number;

  constructor(message = "Invalid data") {
    super(message);
    this.name = "InvalidDataError";
    this.statusCode = 400;
  }
}
