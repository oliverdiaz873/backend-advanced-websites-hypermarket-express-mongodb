const categories = require('../data/categories.data');

const findAll = () => {
  return categories;
};

const findById = (id) => {
  return categories.find((c) => c.id === id) || null;
};

module.exports = { findAll, findById };