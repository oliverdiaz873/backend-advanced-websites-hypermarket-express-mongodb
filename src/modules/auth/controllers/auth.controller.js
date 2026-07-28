const authService = require('../services/auth.service');

const register = (req, res, next) => {
  try {
    const user = authService.register(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const login = (req, res, next) => {
  try {
    const result = authService.login(req.body.email, req.body.password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getMe = (req, res, next) => {
  try {
    const user = authService.getMe(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };