const categoryRepository = require('../repositories/category.repository');
const NotFoundError = require('../../../shared/errors/not-found.error');

const getAll = () => {
  return categoryRepository.findAll();
};

const getById = (id) => {
  const category = categoryRepository.findById(id);
  if (!category) {
    throw new NotFoundError('Category not found');
  }
  return category;
};

module.exports = { getAll, getById };