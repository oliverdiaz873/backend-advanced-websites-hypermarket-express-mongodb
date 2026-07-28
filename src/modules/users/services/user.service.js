const { randomUUID } = require('crypto');
const userRepository = require('../repositories/user.repository');
const NotFoundError = require('../../../shared/errors/not-found.error');
const EmailAlreadyExistsError = require('../../../shared/errors/email-already-exists.error');
const InvalidDataError = require('../../../shared/errors/invalid-data.error');

const ALLOWED_UPDATABLE = ['name', 'email', 'password'];

const toPublicUser = (user) => {
  if (!user) return null;
  const { password, ...publicUser } = user;
  return publicUser;
};

const getAll = () => {
  const users = userRepository.findAll();
  return users.map(toPublicUser);
};

const getById = (id) => {
  const user = userRepository.findById(id);
  if (!user) throw new NotFoundError('User not found');
  return toPublicUser(user);
};

const create = (data) => {
  const email = data.email.toLowerCase().trim();
  const existing = userRepository.findByEmail(email);
  if (existing) throw new EmailAlreadyExistsError();

  if (!data.password || data.password.length < 6) {
    throw new InvalidDataError('Password must be at least 6 characters');
  }

  const now = new Date().toISOString();
  const newUser = {
    id: randomUUID(),
    name: data.name,
    email,
    password: data.password,
    role: 'customer',
    createdAt: now,
    updatedAt: now,
  };

  userRepository.create(newUser);
  return toPublicUser(newUser);
};

const updateById = (id, data) => {
  const user = userRepository.findById(id);
  if (!user) throw new NotFoundError('User not found');

  const updates = {};
  for (const key of ALLOWED_UPDATABLE) {
    if (data[key] !== undefined) {
      if (key === 'email') {
        updates.email = data[key].toLowerCase().trim();
        const existing = userRepository.findByEmail(updates.email);
        if (existing && existing.id !== id) throw new EmailAlreadyExistsError();
      } else {
        updates[key] = data[key];
      }
    }
  }

  if (data.password && data.password.length < 6) {
    throw new InvalidDataError('Password must be at least 6 characters');
  }

  updates.updatedAt = new Date().toISOString();

  const updated = userRepository.updateById(id, updates);
  return toPublicUser(updated);
};

const deleteById = (id) => {
  const user = userRepository.findById(id);
  if (!user) throw new NotFoundError('User not found');
  userRepository.deleteById(id);
  return true;
};

module.exports = { getAll, getById, create, updateById, deleteById };