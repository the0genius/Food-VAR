import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { logger } from "./logger";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

function validateEnvironment() {
  const required = ["DATABASE_URL", "SESSION_SECRET"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logger.error("Missing required environment variables", null, { missing });
    process.exit(1);
  }

  const optional = [
    { key: "AI_INTEGRATIONS_GEMINI_API_KEY", label: "Gemini AI" },
    { key: "AI_INTEGRATIONS_GEMINI_BASE_URL", label: "Gemini base URL" },
  ];
  for (const { key, label } of optional) {
    if (!process.env[key]) {
      logger.warn(`Optional env var ${key} not set — ${label} features may be unavailable`);
    }
  }
}

validateEnvironment();

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupRequestIds(app: express.Application) {
  app.use((req, _res, next) => {
    if (!req.headers["x-request-id"]) {
      req.headers["x-request-id"] = crypto.randomUUID();
    }
    next();
  });
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(",").forEach((o) => {
        const trimmed = o.trim();
        if (trimmed) origins.add(trimmed);
      });
    }

    const origin = req.header("origin");

    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;

    res.on("finish", () => {
      if (!reqPath.startsWith("/api")) return;

      const duration = Date.now() - start;
      const isAuthRoute = reqPath.startsWith("/api/auth");

      logger.request(req, res.statusCode, duration, {
        ...(isAuthRoute ? { redacted: true } : {}),
      });
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  logger.info("Expo static files configured");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
      type?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = status === 500 ? "Internal Server Error" : (error.message || "Internal Server Error");

    if (status >= 500) {
      logger.error("Unhandled server error", err, { status }, req);
    } else {
      logger.warn("Client error", { status, message }, req);
    }

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({
      error: message,
      requestId: req.headers["x-request-id"],
    });
  });
}

(async () => {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many auth attempts, try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });
  const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: "Too many AI requests, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/verify-email", authLimiter);
  app.use("/api/auth/resend-verification", authLimiter);
  app.use("/api/auth/password-reset", authLimiter);
  app.use("/api/auth/refresh", refreshLimiter);
  app.use("/api/auth/logout", refreshLimiter);
  app.use("/api/score", aiLimiter);
  app.use("/api/products/extract", aiLimiter);
  app.use("/api", apiLimiter);

  setupRequestIds(app);
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.info("Server started", { port });
    },
  );
})();
