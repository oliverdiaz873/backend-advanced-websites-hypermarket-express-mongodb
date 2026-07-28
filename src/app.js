const express = require('express');
const cors = require('cors');
const config = require('./config');
const productRoutes = require('./modules/products/routes/product.routes');
const categoryRoutes = require('./modules/categories/routes/category.routes');
const offerRoutes = require('./modules/offers/routes/offer.routes');
const searchRoutes = require('./modules/search/routes/search.routes');
const userRoutes = require('./modules/users/routes/user.routes');
const authRoutes = require('./modules/auth/routes/auth.routes');
const cartRoutes = require('./modules/cart/routes/cart.routes');
const errorHandler = require('./shared/middleware/error-handler');
const logger = require('./shared/middleware/logger.middleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);

app.use(errorHandler);

module.exports = app;