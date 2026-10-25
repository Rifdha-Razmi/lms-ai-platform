import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorField, getErrorMessage } from './apiClient';

const err = (status: number, data: unknown) =>
  new AxiosError('x', 'ERR', undefined, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe('API error envelope (PRD §8.8)', () => {
  it('reads message and field', () => {
    const e = err(400, {
      error: { code: 'VALIDATION_ERROR', message: 'email must be a valid email address', field: 'email' },
    });
    expect(getErrorMessage(e)).toBe('email must be a valid email address');
    expect(getErrorField(e)).toBe('email');
  });
  it('explains rate limiting', () => {
    expect(getErrorMessage(err(429, {}))).toMatch(/Too many requests/);
  });
});
