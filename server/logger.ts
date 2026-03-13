import type { Request } from "express";

export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  msg: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  userId?: number;
  [key: string]: unknown;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function getRequestId(req?: Request): string | undefined {
  return req?.headers?.["x-request-id"] as string | undefined;
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>, req?: Request) {
    const entry: LogEntry = { level: "info", msg, ...meta };
    if (req) entry.requestId = getRequestId(req);
    console.log(formatLog(entry));
  },

  warn(msg: string, meta?: Record<string, unknown>, req?: Request) {
    const entry: LogEntry = { level: "warn", msg, ...meta };
    if (req) entry.requestId = getRequestId(req);
    console.warn(formatLog(entry));
  },

  error(msg: string, error?: unknown, meta?: Record<string, unknown>, req?: Request) {
    const entry: LogEntry = { level: "error", msg, ...meta };
    if (req) entry.requestId = getRequestId(req);
    if (error instanceof Error) {
      entry.errorMessage = error.message;
      entry.stack = error.stack;
    } else if (error) {
      entry.errorMessage = String(error);
    }
    console.error(formatLog(entry));
  },

  debug(msg: string, meta?: Record<string, unknown>, req?: Request) {
    if (process.env.LOG_LEVEL === "debug") {
      const entry: LogEntry = { level: "debug", msg, ...meta };
      if (req) entry.requestId = getRequestId(req);
      console.log(formatLog(entry));
    }
  },

  request(req: Request, statusCode: number, durationMs: number, extra?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "info",
      msg: "request",
      method: req.method,
      path: req.path,
      statusCode,
      durationMs,
      requestId: getRequestId(req),
      ...extra,
    };
    if ((req as any).auth?.userId) {
      entry.userId = (req as any).auth.userId;
    }
    console.log(formatLog(entry));
  },
};
