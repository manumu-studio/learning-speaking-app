// Unit tests for request ID correlation utility
import { describe, it, expect } from 'vitest';
import { getRequestId, withRequestId, currentRequestId } from '../requestId';

describe('getRequestId', () => {
  it('returns x-request-id header value when present', () => {
    const req = new Request('http://localhost/test', {
      headers: { 'x-request-id': 'abc-123' },
    });
    expect(getRequestId(req)).toBe('abc-123');
  });

  it('generates a UUID when no x-request-id header is present', () => {
    const req = new Request('http://localhost/test');
    const id = getRequestId(req);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('generates different UUIDs for different requests', () => {
    const req1 = new Request('http://localhost/test');
    const req2 = new Request('http://localhost/test');
    expect(getRequestId(req1)).not.toBe(getRequestId(req2));
  });
});

describe('withRequestId + currentRequestId', () => {
  it('propagates request ID through AsyncLocalStorage', () => {
    let captured: string | undefined;
    withRequestId('test-id-456', () => {
      captured = currentRequestId();
    });
    expect(captured).toBe('test-id-456');
  });

  it('returns undefined outside of withRequestId context', () => {
    expect(currentRequestId()).toBeUndefined();
  });

  it('isolates request IDs across nested calls', () => {
    const results: (string | undefined)[] = [];
    withRequestId('outer', () => {
      results.push(currentRequestId());
      withRequestId('inner', () => {
        results.push(currentRequestId());
      });
      results.push(currentRequestId());
    });
    expect(results).toEqual(['outer', 'inner', 'outer']);
  });
});
