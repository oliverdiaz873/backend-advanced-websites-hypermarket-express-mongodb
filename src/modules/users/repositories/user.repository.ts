import usersData from "../data/users.data";
import type { User } from "../../../types";

export const findAll = (): User[] => {
  return usersData;
};

export const findById = (id: string): User | null => {
  return usersData.find((u) => u.id === id) || null;
};

export const findByEmail = (email: string): User | null => {
  return usersData.find((u) => u.email === email) || null;
};

export const create = (user: User): User => {
  usersData.push(user);
  return user;
};

export const updateById = (id: string, data: Partial<User>): User | null => {
  const index = usersData.findIndex((u) => u.id === id);
  if (index === -1) return null;
  usersData[index] = { ...usersData[index], ...data };
  return usersData[index];
};

export const deleteById = (id: string): boolean => {
  const index = usersData.findIndex((u) => u.id === id);
  if (index === -1) return false;
  usersData.splice(index, 1);
  return true;
};
