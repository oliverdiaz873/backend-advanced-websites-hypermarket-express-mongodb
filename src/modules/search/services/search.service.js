const productRepository = require('../../products/repositories/product.repository');

const search = (query, category) => {
  if (!query || !query.trim()) {
    const error = new Error('Search term is required');
    error.statusCode = 400;
    throw error;
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