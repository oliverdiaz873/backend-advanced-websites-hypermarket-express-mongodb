import mongoose from "mongoose";

export const dbState = (readyState: number): string => {
  switch (readyState) {
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "disconnected";
  }
};

export const buildHealth = (readyState: number) => ({
  status: "ok",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  database: dbState(readyState),
});

export const buildReadiness = (readyState: number) => {
  const ready = readyState === 1;
  return {
    status: ready ? "ready" : "unavailable",
    database: dbState(readyState),
    timestamp: new Date().toISOString(),
  };
};

export const isMongoReady = (): boolean => mongoose.connection.readyState === 1;