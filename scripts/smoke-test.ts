#!/usr/bin/env npx tsx

const BASE_URL = process.env.SMOKE_TEST_URL || "http://localhost:5000";
const TIMEOUT_MS = 10_000;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function fetchJSON(path: string, options: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error, durationMs: Date.now() - start });
    console.log(`  ✗ ${name}: ${error}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log(`\nSmoke testing ${BASE_URL}\n`);

  console.log("--- Health & Readiness ---");

  await test("GET /api/health returns 200 with status ok", async () => {
    const { status, body } = await fetchJSON("/api/health");
    assert(status === 200, `Expected 200, got ${status}`);
    const data = body as Record<string, unknown>;
    assert(data.status === "ok", `Expected status ok, got ${data.status}`);
  });

  await test("GET /api/readiness returns 200", async () => {
    const { status, body } = await fetchJSON("/api/readiness");
    assert(status === 200, `Expected 200, got ${status}`);
    const data = body as Record<string, unknown>;
    assert(data.status === "ready", `Expected status ready, got ${data.status}`);
  });

  console.log("\n--- Auth ---");

  let accessToken = "";
  let refreshToken = "";

  if (process.env.NODE_ENV !== "production") {
    await test("POST /api/auth/dev-login returns tokens and user", async () => {
      const { status, body } = await fetchJSON("/api/auth/dev-login", { method: "POST" });
      assert(status === 200, `Expected 200, got ${status}`);
      const data = body as Record<string, unknown>;
      assert(typeof data.accessToken === "string", "Missing accessToken");
      assert(typeof data.refreshToken === "string", "Missing refreshToken");
      assert(typeof data.user === "object" && data.user !== null, "Missing user object");
      const user = data.user as Record<string, unknown>;
      assert(!("passwordHash" in user), "passwordHash should be stripped");
      accessToken = data.accessToken as string;
      refreshToken = data.refreshToken as string;
    });

    await test("GET /api/auth/me returns user with valid token", async () => {
      if (!accessToken) throw new Error("No access token from dev-login");
      const { status, body } = await fetchJSON("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert(status === 200, `Expected 200, got ${status}`);
      const data = body as Record<string, unknown>;
      assert(typeof data.email === "string", "Missing email");
    });

    await test("GET /api/auth/me returns 401 without token", async () => {
      const { status } = await fetchJSON("/api/auth/me");
      assert(status === 401, `Expected 401, got ${status}`);
    });

    await test("POST /api/auth/refresh rotates token", async () => {
      if (!refreshToken) throw new Error("No refresh token from dev-login");
      const { status, body } = await fetchJSON("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      assert(status === 200, `Expected 200, got ${status}`);
      const data = body as Record<string, unknown>;
      assert(typeof data.accessToken === "string", "Missing new accessToken");
      assert(typeof data.refreshToken === "string", "Missing new refreshToken");
      assert(data.refreshToken !== refreshToken, "Refresh token should be rotated");
      accessToken = data.accessToken as string;
      refreshToken = data.refreshToken as string;
    });
  }

  console.log("\n--- Products ---");

  await test("GET /api/products/barcode/0000000000000 returns 404 for unknown barcode", async () => {
    const { status } = await fetchJSON("/api/products/barcode/0000000000000");
    assert(status === 404, `Expected 404, got ${status}`);
  });

  let seedProductId: number | null = null;

  await test("GET /api/products/search?q= returns seeded products", async () => {
    const { status, body } = await fetchJSON("/api/products/search?q=&limit=5");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body), "Expected array response");
    const products = body as Array<Record<string, unknown>>;
    if (products.length > 0) {
      seedProductId = products[0].id as number;
      assert(typeof products[0].name === "string", "Product missing name");
      assert(typeof products[0].barcode === "string", "Product missing barcode");
    }
  });

  await test("GET /api/products/search?q=coca returns filtered results", async () => {
    const { status, body } = await fetchJSON("/api/products/search?q=coca");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body), "Expected array response");
  });

  if (seedProductId) {
    const knownBarcodes = ["0049000006346", "0078000113464", "0030000063170"];
    await test("GET /api/products/barcode/:barcode returns product for seeded barcode", async () => {
      let found = false;
      for (const barcode of knownBarcodes) {
        const { status, body } = await fetchJSON(`/api/products/barcode/${barcode}`);
        if (status === 200) {
          const data = body as Record<string, unknown>;
          assert(typeof data.name === "string", "Missing product name");
          assert(typeof data.barcode === "string", "Missing product barcode");
          assert(typeof data.id === "number", "Missing product id");
          found = true;
          break;
        }
      }
      assert(found, "No seeded product found via barcode lookup");
    });
  }

  if (accessToken) {
    console.log("\n--- Score ---");

    const productId = seedProductId;

    if (productId) {
      await test("POST /api/score returns valid score shape", async () => {
        const { status, body } = await fetchJSON("/api/score", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ productId }),
        });
        assert(status === 200, `Expected 200, got ${status}`);
        const data = body as Record<string, unknown>;
        assert(typeof data.score === "number", "Missing score number");
        assert(typeof data.label === "string", "Missing score label");
        assert(typeof data.isAllergenAlert === "boolean", "Missing isAllergenAlert");
        assert(Array.isArray(data.matchedAllergens), "Missing matchedAllergens array");
        assert(typeof data.allergenDisplayState === "string", "Missing allergenDisplayState");
        assert(typeof data.adviceText === "string", "Missing adviceText");
        assert(typeof data.headline === "string", "Missing headline");
      });
    }

    console.log("\n--- History ---");

    await test("GET /api/history returns array", async () => {
      const { status, body } = await fetchJSON("/api/history", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert(status === 200, `Expected 200, got ${status}`);
      assert(Array.isArray(body), "Expected array response");
    });

    await test("GET /api/scans/today returns count and limit", async () => {
      const { status, body } = await fetchJSON("/api/scans/today", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert(status === 200, `Expected 200, got ${status}`);
      const data = body as Record<string, unknown>;
      assert(typeof data.count === "number", "Expected count number");
      assert(typeof data.limit === "number", "Expected limit number");
    });

    console.log("\n--- Account ---");

    await test("GET /api/auth/export returns user data export", async () => {
      const { status, body } = await fetchJSON("/api/auth/export", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert(status === 200, `Expected 200, got ${status}`);
      const data = body as Record<string, unknown>;
      assert(typeof data.exportedAt === "string", "Missing exportedAt");
      assert(data.profile !== undefined, "Missing profile");
      assert(Array.isArray(data.scanHistory), "Missing scanHistory array");
    });

    await test("DELETE /api/auth/account requires auth", async () => {
      const { status } = await fetchJSON("/api/auth/account", { method: "DELETE" });
      assert(status === 401, `Expected 401, got ${status}`);
    });
  }

  console.log("\n--- Validation ---");

  await test("POST /api/auth/google with empty body returns 400", async () => {
    const { status } = await fetchJSON("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("POST /api/auth/refresh with empty body returns 400", async () => {
    const { status } = await fetchJSON("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("POST /api/score without auth returns 401", async () => {
    const { status } = await fetchJSON("/api/score", {
      method: "POST",
      body: JSON.stringify({ productId: 1 }),
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  console.log("\n=============================");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  ✗ ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log("\nAll smoke tests passed!");
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Smoke test runner failed:", err);
  process.exit(1);
});
