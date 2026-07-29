export class EmailAlreadyExistsError extends Error {
  statusCode: number;

  constructor(message = "Email already exists") {
    super(message);
    this.name = "EmailAlreadyExistsError";
    this.statusCode = 409;
  }
}
