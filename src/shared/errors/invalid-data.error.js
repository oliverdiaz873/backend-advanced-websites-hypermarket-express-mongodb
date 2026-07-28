class InvalidDataError extends Error {
  constructor(message = 'Invalid data') {
    super(message);
    this.name = 'InvalidDataError';
    this.statusCode = 400;
  }
}

module.exports = InvalidDataError;