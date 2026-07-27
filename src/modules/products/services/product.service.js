const productRepository = require('../repositories/product.repository');
const NotFoundError = require('../../../shared/errors/not-found.error');

const getAll = () => {
  return productRepository.findAll();
};

const getById = (id) => {
  const product = productRepository.findById(id);
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  return product;
};

module.exports = { getAll, getById };