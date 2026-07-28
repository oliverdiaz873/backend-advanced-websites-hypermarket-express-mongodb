const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { validateRequiredFields } = require('../../../shared/middleware/validation.middleware');

const router = Router();

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', validateRequiredFields(['name', 'email', 'password']), userController.create);
router.patch('/:id', userController.updateById);
router.delete('/:id', userController.deleteById);

module.exports = router;