const productRepository = require('../repositories/product.repository');

const getAll = () => {
  return productRepository.findAll();
};

const getById = (id) => {
  const product = productRepository.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  return product;
};

module.exports = { getAll, getById };