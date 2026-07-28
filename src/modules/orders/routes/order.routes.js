const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../../../shared/middleware/auth.middleware');
const { validateRequiredFields } = require('../../../shared/middleware/validation.middleware');

const router = Router();

router.use(authMiddleware);

router.post('/', orderController.create);
router.get('/', orderController.findAll);
router.get('/:id', orderController.findById);
router.patch('/:id/status', validateRequiredFields(['status']), orderController.updateStatus);

module.exports = router;