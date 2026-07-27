const { Router } = require('express');
const offerController = require('../controllers/offer.controller');

const router = Router();

router.get('/', offerController.getAll);

module.exports = router;