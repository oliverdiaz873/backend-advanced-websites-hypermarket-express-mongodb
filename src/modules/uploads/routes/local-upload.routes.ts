import { Request, Response, NextFunction, Router } from "express";
import express from "express";
import config from "../../../config";
import { getStorageProvider } from "../../../shared/storage/storage.factory";
import { LocalStorageProvider } from "../../../shared/storage/local.provider";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";

/**
 * Recibe el binario subido por el cliente en desarrollo (provider local).
 * Implementa el mismo contrato de "presigned URL": la uploadUrl firmada
 * apunta aquí y la firma se valida antes de escribir en disco.
 */
const router = Router();

router.put(
  "/local",
  express.raw({ type: () => true, limit: config.uploadMaxSizeBytes }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = getStorageProvider();
      if (!(provider instanceof LocalStorageProvider)) {
        res.status(404).json({ success: false, message: "Route not found", statusCode: 404 });
        return;
      }

      const { key, contentType, expires, sig } = req.query;
      if (
        typeof key !== "string" ||
        typeof contentType !== "string" ||
        typeof expires !== "string" ||
        typeof sig !== "string"
      ) {
        throw new InvalidDataError("Missing or invalid upload parameters");
      }

      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        throw new InvalidDataError("Empty upload body");
      }

      await provider.receiveUpload({
        key,
        contentType,
        expires: Number(expires),
        signature: sig,
        body,
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
