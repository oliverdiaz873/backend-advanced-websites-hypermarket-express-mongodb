import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getRequestId = (): string | undefined => requestContext.getStore()?.requestId;

export const runWithRequestId = <T>(requestId: string, fn: () => T): T =>
  requestContext.run({ requestId }, fn);