const orderService = require('../services/order.service');

const create = async (req, res, next) => {
  try {
    const order = await orderService.create(req.user.id);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

const findAll = async (req, res, next) => {
  try {
    const orders = await orderService.findByUser(req.user.id);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const order = await orderService.findById(req.user.id, req.params.id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateStatus(req.user.id, req.params.id, req.body.status);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, findAll, findById, updateStatus };