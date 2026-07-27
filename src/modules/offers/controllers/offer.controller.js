const offerService = require('../services/offer.service');

const getAll = (req, res, next) => {
  try {
    const offers = offerService.getAll();
    res.json({ success: true, data: offers });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll };