// Request ID correlation — extracts or generates a unique ID per request for log tracing
import { AsyncLocalStorage } from 'node:async_hooks';

const requestIdStore = new AsyncLocalStorage<string>();

/** Extract request ID from x-request-id header (Vercel sets this), or generate a UUID */
export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

/** Run a function with a request ID bound in AsyncLocalStorage */
export function withRequestId<T>(requestId: string, fn: () => T): T {
  return requestIdStore.run(requestId, fn);
}

/** Read the current request ID from AsyncLocalStorage (undefined outside withRequestId) */
export function currentRequestId(): string | undefined {
  return requestIdStore.getStore();
}
