const { randomUUID } = require('crypto');

const users = [
  {
    id: randomUUID(),
    name: 'Oliver Diaz',
    email: 'oliver@email.com',
    password: 'TEMP_PASSWORD_DO_NOT_USE',
    role: 'admin',
    createdAt: new Date('2026-01-15').toISOString(),
    updatedAt: new Date('2026-01-15').toISOString(),
  },
  {
    id: randomUUID(),
    name: 'Maria Garcia',
    email: 'maria@email.com',
    password: 'TEMP_PASSWORD_DO_NOT_USE',
    role: 'customer',
    createdAt: new Date('2026-03-20').toISOString(),
    updatedAt: new Date('2026-03-20').toISOString(),
  },
  {
    id: randomUUID(),
    name: 'Carlos Lopez',
    email: 'carlos@email.com',
    password: 'TEMP_PASSWORD_DO_NOT_USE',
    role: 'customer',
    createdAt: new Date('2026-05-10').toISOString(),
    updatedAt: new Date('2026-05-10').toISOString(),
  },
];

module.exports = users;
