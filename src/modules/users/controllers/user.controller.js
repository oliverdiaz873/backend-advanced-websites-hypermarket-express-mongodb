const userService = require('../services/user.service');

const getAll = (req, res, next) => {
  try {
    const users = userService.getAll();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getById = (req, res, next) => {
  try {
    const user = userService.getById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const create = (req, res, next) => {
  try {
    const user = userService.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const updateById = (req, res, next) => {
  try {
    const user = userService.updateById(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const deleteById = (req, res, next) => {
  try {
    userService.deleteById(req.params.id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, updateById, deleteById };