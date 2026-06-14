/**
 * @file src/services/ApiClient.ts
 * @description Typed HTTP client wrapping Playwright's APIRequestContext.
 *
 * Design:
 *  - Constructor injection of APIRequestContext (Dependency Inversion Principle).
 *  - Generic `request<T>()` method keeps callers type-safe without repeating logic.
 *  - Logging is injected too, so we can see every request/response in the test log.
 *  - Error responses are never silently swallowed — they throw descriptive errors.
 */

import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { IApiRequestOptions, IApiResponse, HttpMethod } from '../types/index';
import { Logger } from '../utils/Logger';

const log = Logger.forContext('ApiClient');

export class ApiClient {
  private readonly requestContext: APIRequestContext;
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  public constructor(
    requestContext: APIRequestContext,
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
  ) {
    this.requestContext = requestContext;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // strip trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...defaultHeaders,
    };
  }

  // ─── Core request method ──────────────────────────────────────────────────

  public async request<T = unknown>(options: IApiRequestOptions): Promise<IApiResponse<T>> {
    const { method, endpoint, body, headers = {}, queryParams } = options;
    const url = this.buildUrl(endpoint, queryParams);
    const mergedHeaders = { ...this.defaultHeaders, ...headers };

    log.debug(`→ ${method} ${url}`, { body: body ?? null });

    const startTime = Date.now();
    let response: APIResponse;

    try {
      response = await this.executeRequest(method, url, mergedHeaders, body);
    } catch (err) {
      log.error(`Request failed: ${method} ${url}`, err);
      throw err;
    }

    const duration = Date.now() - startTime;
    const responseBody = await this.parseBody<T>(response);

    log.debug(`← ${response.status()} ${method} ${url} (${duration}ms)`, {
      status: response.status(),
    });

    if (!response.ok()) {
      log.warn(`Non-OK response: ${response.status()} for ${method} ${url}`, {
        body: responseBody,
      });
    }

    return {
      status: response.status(),
      headers: response.headers() as Record<string, string>,
      body: responseBody,
      ok: response.ok(),
    };
  }

  // ─── Convenience methods ──────────────────────────────────────────────────

  public async get<T = unknown>(
    endpoint: string,
    queryParams?: Record<string, string>,
  ): Promise<IApiResponse<T>> {
    return this.request<T>({ method: 'GET', endpoint, queryParams });
  }

  public async post<T = unknown>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<IApiResponse<T>> {
    return this.request<T>({ method: 'POST', endpoint, body });
  }

  public async put<T = unknown>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<IApiResponse<T>> {
    return this.request<T>({ method: 'PUT', endpoint, body });
  }

  public async patch<T = unknown>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<IApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', endpoint, body });
  }

  public async delete<T = unknown>(endpoint: string): Promise<IApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', endpoint });
  }

  // ─── Auth helpers ─────────────────────────────────────────────────────────

  /**
   * Sets a Bearer token for subsequent requests.
   * Returns `this` so calls can be chained.
   */
  public withBearerToken(token: string): this {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    return this;
  }

  public clearAuth(): this {
    delete this.defaultHeaders['Authorization'];
    return this;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildUrl(endpoint: string, queryParams?: Record<string, string>): string {
    const base = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return base;
    }
    const params = new URLSearchParams(queryParams).toString();
    return `${base}?${params}`;
  }

  private async executeRequest(
    method: HttpMethod,
    url: string,
    headers: Record<string, string>,
    body?: Record<string, unknown>,
  ): Promise<APIResponse> {
    const options = { headers, data: body };

    switch (method) {
      case 'GET':
        return this.requestContext.get(url, { headers });
      case 'POST':
        return this.requestContext.post(url, options);
      case 'PUT':
        return this.requestContext.put(url, options);
      case 'PATCH':
        return this.requestContext.patch(url, options);
      case 'DELETE':
        return this.requestContext.delete(url, { headers });
      default:
        throw new Error(`Unsupported HTTP method: ${method as string}`);
    }
  }

  private async parseBody<T>(response: APIResponse): Promise<T> {
    const contentType = response.headers()['content-type'] ?? '';
    try {
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    } catch {
      return (await response.text()) as unknown as T;
    }
  }
}
