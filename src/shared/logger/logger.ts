import { getRequestId } from "./request-context";

export type LogLevel = "info" | "warn" | "error";

export interface LogMetadata {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  metadata?: LogMetadata;
}

const write = (level: LogLevel, message: string, metadata?: LogMetadata): void => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  const requestId = getRequestId();
  if (requestId) entry.requestId = requestId;

  if (metadata && Object.keys(metadata).length > 0) {
    entry.metadata = metadata;
  }

  const line = JSON.stringify(entry);

  // El logging no debe poder tumbar el proceso: si el stream de salida se
  // rompe (p. ej. EPIPE al estar conectado a un pipe que se cerró), lo
  // silenciamos en lugar de propagar un error asíncrono sin capturar.
  try {
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  } catch {
    /* el fallo de logging nunca debe interrumpir la API */
  }
};

export const logger = {
  info: (message: string, metadata?: LogMetadata): void => write("info", message, metadata),
  warn: (message: string, metadata?: LogMetadata): void => write("warn", message, metadata),
  error: (message: string, metadata?: LogMetadata): void => write("error", message, metadata),
};