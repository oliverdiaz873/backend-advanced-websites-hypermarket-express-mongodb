import type { Response } from "express";
import type { CookieOptions } from "express";
import config from "../../config";

/**
 * Opciones de la cookie de sesión (httpOnly), host-only (sin `Domain`) y con
 * `SameSite` explícito por entorno/topología.
 *
 * - Topología same-origin (proxy/rewrites `/api` en el storefront) => `Lax`.
 * - `Secure` se habilita por config explícita (`AUTH_COOKIE_SECURE`), no por
 *   `NODE_ENV`: depende del despliegue final (HTTPS), no del entorno.
 */
const cookieOptions = (): CookieOptions => ({
  httpOnly: config.authCookieHttpOnly,
  secure: config.authCookieSecure,
  sameSite: config.authCookieSameSite,
  path: "/",
});

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(config.authCookieName, token, {
    ...cookieOptions(),
    maxAge: config.authCookieMaxAgeSeconds * 1000,
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(config.authCookieName, cookieOptions());
};