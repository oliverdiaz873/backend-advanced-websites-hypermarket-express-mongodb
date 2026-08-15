import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../../config";
import type { JwtPayload } from "../../types";

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  // Antes que la cookie, para no romper el flujo actual del dashboard (Bearer).
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && typeof req.cookies[config.authCookieName] === "string") {
    token = req.cookies[config.authCookieName];
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Missing or invalid authorization header",
      statusCode: 401,
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      statusCode: 401,
    });
    return;
  }
};

export const authorizeRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        statusCode: 401,
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
        statusCode: 403,
      });
      return;
    }

    next();
  };
};

export default authMiddleware;
