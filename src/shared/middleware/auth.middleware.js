const jwt = require('jsonwebtoken');
const config = require('../../config');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid authorization header',
      statusCode: 401,
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      statusCode: 401,
    });
  }
};

module.exports = authMiddleware;