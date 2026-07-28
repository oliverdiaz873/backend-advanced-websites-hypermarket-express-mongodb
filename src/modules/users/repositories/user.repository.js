const usersData = require('../data/users.data');

const findAll = () => {
  return usersData;
};

const findById = (id) => {
  return usersData.find((u) => u.id === id) || null;
};

const findByEmail = (email) => {
  return usersData.find((u) => u.email === email) || null;
};

const create = (user) => {
  usersData.push(user);
  return user;
};

const updateById = (id, data) => {
  const index = usersData.findIndex((u) => u.id === id);
  if (index === -1) return null;
  usersData[index] = { ...usersData[index], ...data };
  return usersData[index];
};

const deleteById = (id) => {
  const index = usersData.findIndex((u) => u.id === id);
  if (index === -1) return false;
  usersData.splice(index, 1);
  return true;
};

module.exports = { findAll, findById, findByEmail, create, updateById, deleteById };