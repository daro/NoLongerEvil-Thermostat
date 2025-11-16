/**
 * Debug Logger Middleware
 *
 * Optional request/response logging for troubleshooting and development.
 * Activated via DEBUG_LOGGING environment variable.
 *
 * Logs:
 * - Request: method, URL, headers, body
 * - Response: status code, headers, body
 */

import { IncomingMessage, ServerResponse } from 'http';

interface LogEntry {
  timestamp: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, any>;
    body?: any;
  };
  response?: {
    statusCode: number;
    headers: Record<string, any>;
    body?: any;
  };
}

/**
 * Log request details to console
 */
export function logRequest(req: IncomingMessage, body?: any): void {
  const timestamp = new Date().toISOString();
  const logEntry: LogEntry = {
    timestamp,
    request: {
      method: req.method || 'UNKNOWN',
      url: req.url || '/',
      headers: req.headers,
      body: body || undefined,
    },
  };

  console.log('\n--- REQUEST ---');
  console.log(JSON.stringify(logEntry, null, 2));
}

/**
 * Intercept response to log response details
 * Returns a wrapper function that should be called with response body
 */
export function createResponseLogger(
  req: IncomingMessage,
  res: ServerResponse
): (body?: any) => void {
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  let responseBody = '';

  res.write = function (chunk: any, ...args: any[]): boolean {
    if (chunk) {
      responseBody += chunk.toString();
    }
    return originalWrite(chunk, ...args);
  };

  res.end = function (chunk?: any, ...args: any[]): any {
    if (chunk) {
      responseBody += chunk.toString();
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      request: {
        method: req.method,
        url: req.url,
      },
      response: {
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body: tryParseJSON(responseBody),
      },
    };

    console.log('\n--- RESPONSE ---');
    console.log(JSON.stringify(logEntry, null, 2));
    console.log('---\n');

    return originalEnd(chunk, ...args);
  };

  return () => {};
}

/**
 * Try to parse response body as JSON, fallback to raw string
 */
function tryParseJSON(body: string): any {
  if (!body) {
    return undefined;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body.length > 500 ? body.substring(0, 500) + '...' : body;
  }
}
