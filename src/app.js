const express = require('express');
const config = require('./config');
const productRoutes = require('./modules/products/routes/product.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/products', productRoutes);

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    statusCode,
  });
});

module.exports = app;