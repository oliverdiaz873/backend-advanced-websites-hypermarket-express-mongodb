const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../../config');
const userRepository = require('../../users/repositories/user.repository');
const userService = require('../../users/services/user.service');
const InvalidDataError = require('../../../shared/errors/invalid-data.error');
const EmailAlreadyExistsError = require('../../../shared/errors/email-already-exists.error');

const SALT_ROUNDS = 10;

const register = async (data) => {
  const email = data.email.toLowerCase().trim();
  const existing = userRepository.findByEmail(email);
  if (existing) throw new EmailAlreadyExistsError();

  if (!data.password || data.password.length < 6) {
    throw new InvalidDataError('Password must be at least 6 characters');
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = userService.create({
    name: data.name,
    email,
    password: hashedPassword,
  });

  return user;
};

const login = async (email, password) => {
  if (!email || !password) {
    throw new InvalidDataError('Email and password are required');
  }

  const user = userRepository.findByEmail(email.toLowerCase().trim());
  if (!user) {
    throw new InvalidDataError('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new InvalidDataError('Invalid credentials');
  }

  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const { password: _, ...publicUser } = user;

  return { token, user: publicUser };
};

const getMe = (userId) => {
  const user = userRepository.findById(userId);
  if (!user) {
    throw new InvalidDataError('User not found');
  }
  const { password: _, ...publicUser } = user;
  return publicUser;
};

module.exports = { register, login, getMe };