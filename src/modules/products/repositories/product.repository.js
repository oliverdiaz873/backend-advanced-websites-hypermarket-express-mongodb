const products = require('../data/products.data');

const findAll = () => {
  return products;
};

const findById = (id) => {
  return products.find((p) => p.id === id) || null;
};

module.exports = { findAll, findById };