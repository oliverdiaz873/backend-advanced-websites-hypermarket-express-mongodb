const productRepository = require('../../products/repositories/product.repository');
const InvalidDataError = require('../../../shared/errors/invalid-data.error');

const search = (query, category) => {
  if (!query || !query.trim()) {
    throw new InvalidDataError('Search term is required');
  }

  const term = query.toLowerCase().trim();
  const products = productRepository.findAll();

  let results = products.filter((p) => p.name.toLowerCase().includes(term));

  if (category) {
    const normalizedCategory = category.trim().toLowerCase();
    results = results.filter((p) => p.category.toLowerCase() === normalizedCategory);
  }

  return results;
};

module.exports = { search };