// Request ID correlation — extracts or generates a unique ID per request for log tracing
import { AsyncLocalStorage } from 'node:async_hooks';

const requestIdStore = new AsyncLocalStorage<string>();

/**
 * Extracts the request ID from the `x-request-id` header (set by Vercel's edge), or generates a new UUID.
 *
 * @param request - The incoming HTTP request.
 * @returns A request-scoped correlation ID string.
 */
export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

/**
 * Runs a function with a request ID bound in `AsyncLocalStorage`, making it available
 * to any synchronous or asynchronous code within the call chain via {@link currentRequestId}.
 *
 * @param requestId - The correlation ID to bind.
 * @param fn - The function to execute within the request ID context.
 * @returns Whatever `fn` returns.
 */
export function withRequestId<T>(requestId: string, fn: () => T): T {
  return requestIdStore.run(requestId, fn);
}

/**
 * Reads the current request ID from `AsyncLocalStorage`.
 *
 * @returns The bound request ID, or `undefined` when called outside a {@link withRequestId} context.
 */
export function currentRequestId(): string | undefined {
  return requestIdStore.getStore();
}
