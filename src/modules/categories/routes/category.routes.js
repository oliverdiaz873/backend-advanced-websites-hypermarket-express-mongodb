const { Router } = require('express');
const categoryController = require('../controllers/category.controller');

const router = Router();

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);

module.exports = router;