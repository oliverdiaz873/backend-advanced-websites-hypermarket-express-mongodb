import express, { Router } from "express";
import jwt from "jsonwebtoken";
import config from "../../../src/config";
import errorHandler from "../../../src/shared/middleware/error-handler";

export const createTestApp = (basePath: string, router: Router): express.Express => {
  const app = express();
  app.use(express.json());
  app.use(basePath, router);
  app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({ success: false, message: "Route not found", statusCode: 404 });
  });
  app.use(errorHandler);
  return app;
};

export const createAuthToken = (payload: { id: string; email: string; role: string }): string =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: "1h" });

export const toJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
