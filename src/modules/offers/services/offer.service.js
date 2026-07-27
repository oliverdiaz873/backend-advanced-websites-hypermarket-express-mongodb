const offerRepository = require('../repositories/offer.repository');
const productRepository = require('../../products/repositories/product.repository');

const getAll = () => {
  const offers = offerRepository.findAll();

  return offers.map((offer) => {
    const product = productRepository.findById(offer.productId);
    if (!product) return null;

    const price = product.price;
    const oldPriceNumeric = parseFloat(offer.oldPrice.replace(/[RD$\s,]/g, ''));
    const discountPercentage = oldPriceNumeric
      ? Math.round(((oldPriceNumeric - price) / oldPriceNumeric) * 100)
      : 0;

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      oldPrice: offer.oldPrice,
      discountPercentage,
      image: product.image,
      category: product.category,
      unit: product.unit,
      unitQuantity: product.unitQuantity,
    };
  }).filter(Boolean);
};

module.exports = { getAll };