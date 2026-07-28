const { Router } = require('express');
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../../../shared/middleware/auth.middleware');
const { validateRequiredFields } = require('../../../shared/middleware/validation.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/', cartController.getCart);
router.post('/items', validateRequiredFields(['productId']), cartController.addItem);
router.patch('/items/:productId', cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;