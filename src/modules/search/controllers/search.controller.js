const searchService = require('../services/search.service');

const search = (req, res, next) => {
  try {
    const { q, category } = req.query;
    const results = searchService.search(q, category);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

module.exports = { search };