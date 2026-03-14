import pino from "pino";
import type { Request } from "express";

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "tokenHash",
      "refreshToken",
      "accessToken",
      "authorization",
      "req.headers.authorization",
      "healthConditions",
      "chatContent",
      "imagePayload",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.refreshToken",
      "*.accessToken",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
});

function getRequestId(req?: Request): string | undefined {
  return req?.headers?.["x-request-id"] as string | undefined;
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>, req?: Request) {
    const child = req ? pinoLogger.child({ requestId: getRequestId(req) }) : pinoLogger;
    child.info(meta || {}, msg);
  },

  warn(msg: string, meta?: Record<string, unknown>, req?: Request) {
    const child = req ? pinoLogger.child({ requestId: getRequestId(req) }) : pinoLogger;
    child.warn(meta || {}, msg);
  },

  error(msg: string, error?: unknown, meta?: Record<string, unknown>, req?: Request) {
    const child = req ? pinoLogger.child({ requestId: getRequestId(req) }) : pinoLogger;
    if (error instanceof Error) {
      child.error({ ...meta, err: error }, msg);
    } else if (error) {
      child.error({ ...meta, errorMessage: String(error) }, msg);
    } else {
      child.error(meta || {}, msg);
    }
  },

  debug(msg: string, meta?: Record<string, unknown>, req?: Request) {
    const child = req ? pinoLogger.child({ requestId: getRequestId(req) }) : pinoLogger;
    child.debug(meta || {}, msg);
  },

  request(req: Request, statusCode: number, durationMs: number, extra?: Record<string, unknown>) {
    const child = pinoLogger.child({ requestId: getRequestId(req) });
    child.info({
      method: req.method,
      path: req.path,
      statusCode,
      durationMs,
      userId: (req as any).auth?.userId,
      ...extra,
    }, "request");
  },
};
