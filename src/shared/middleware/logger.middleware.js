const logger = (req, res, next) => {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${method} ${url} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

module.exports = logger;