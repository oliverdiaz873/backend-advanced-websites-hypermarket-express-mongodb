const express = require('express');
const config = require('./config');
const productRoutes = require('./modules/products/routes/product.routes');
const errorHandler = require('./shared/middleware/error-handler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/products', productRoutes);

app.use(errorHandler);

module.exports = app;