const express = require('express');
const config = require('./config');
const productRoutes = require('./modules/products/routes/product.routes');
const categoryRoutes = require('./modules/categories/routes/category.routes');
const offerRoutes = require('./modules/offers/routes/offer.routes');
const errorHandler = require('./shared/middleware/error-handler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/offers', offerRoutes);

app.use(errorHandler);

module.exports = app;