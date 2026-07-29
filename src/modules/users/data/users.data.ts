import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { User } from "../../../types";

const SALT_ROUNDS = 10;
const hash = bcrypt.hashSync("123456", SALT_ROUNDS);

const users: User[] = [
  {
    id: randomUUID(),
    name: "Oliver Diaz",
    email: "oliver@email.com",
    password: hash,
    role: "admin",
    createdAt: new Date("2026-01-15").toISOString(),
    updatedAt: new Date("2026-01-15").toISOString(),
  },
  {
    id: randomUUID(),
    name: "Maria Garcia",
    email: "maria@email.com",
    password: hash,
    role: "customer",
    createdAt: new Date("2026-03-20").toISOString(),
    updatedAt: new Date("2026-03-20").toISOString(),
  },
  {
    id: randomUUID(),
    name: "Carlos Lopez",
    email: "carlos@email.com",
    password: hash,
    role: "customer",
    createdAt: new Date("2026-05-10").toISOString(),
    updatedAt: new Date("2026-05-10").toISOString(),
  },
];

export default users;
