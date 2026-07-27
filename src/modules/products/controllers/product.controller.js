const productService = require('../services/product.service');

const getAll = (req, res, next) => {
  try {
    const products = productService.getAll();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

const getById = (req, res, next) => {
  try {
    const product = productService.getById(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById };