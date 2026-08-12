import { randomBytes } from "crypto";

const pad = (value: number, length: number): string => String(value).padStart(length, "0");

export const generateOrderNumber = (date: Date = new Date()): string => {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1, 2);
  const dd = pad(date.getDate(), 2);
  const token = randomBytes(3).toString("hex").toUpperCase();
  return `HM-${yyyy}${mm}${dd}-${token}`;
};
