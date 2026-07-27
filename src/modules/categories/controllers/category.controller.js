const categoryService = require('../services/category.service');

const getAll = (req, res, next) => {
  try {
    const categories = categoryService.getAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

const getById = (req, res, next) => {
  try {
    const category = categoryService.getById(req.params.id);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById };