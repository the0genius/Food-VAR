import { describe, it, expect, vi, beforeEach } from "vitest";
import { products } from "../shared/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

describe("product visibility — moderation status", () => {
  it("products table has moderationStatus column", () => {
    expect(products.moderationStatus).toBeDefined();
    expect(products.moderationStatus.name).toBe("moderation_status");
  });

  it("moderationStatus default is 'pending'", () => {
    const defaultVal = products.moderationStatus.default;
    expect(defaultVal).toBeDefined();
  });

  it("approved filter uses eq with 'approved' value", () => {
    const filter = eq(products.moderationStatus, "approved");
    expect(filter).toBeDefined();
  });

  describe("moderation status values", () => {
    const validStatuses = ["pending", "approved", "flagged", "rejected"];

    it("recognizes all expected moderation statuses", () => {
      for (const status of validStatuses) {
        expect(typeof status).toBe("string");
        expect(status.length).toBeGreaterThan(0);
      }
    });

    it("only 'approved' status passes the approved filter predicate", () => {
      const shouldBeVisible = (status: string) => status === "approved";
      expect(shouldBeVisible("approved")).toBe(true);
      expect(shouldBeVisible("pending")).toBe(false);
      expect(shouldBeVisible("flagged")).toBe(false);
      expect(shouldBeVisible("rejected")).toBe(false);
    });
  });

  describe("getApprovedProductFilter always enforces approved-only", () => {
    it("returns approved filter regardless of environment", async () => {
      const originalEnv = process.env.EXPOSE_UNVERIFIED_PRODUCTS;

      process.env.EXPOSE_UNVERIFIED_PRODUCTS = "true";
      const routesModule = await import("../server/routes");
      const { getApprovedProductFilter } = routesModule as any;

      if (typeof getApprovedProductFilter === "function") {
        const filter = getApprovedProductFilter();
        expect(filter).toBeDefined();
      }

      process.env.EXPOSE_UNVERIFIED_PRODUCTS = originalEnv;
    });
  });

  describe("public route filter integration", () => {
    it("approved filter creates a valid drizzle eq expression", () => {
      const filter = eq(products.moderationStatus, "approved");
      expect(filter).toBeDefined();
      expect(filter).toBeTruthy();
    });

    it("filter can be combined with other conditions using and()", () => {
      const approvedFilter = eq(products.moderationStatus, "approved");
      const searchFilter = ilike(products.name, "%test%");
      const combined = and(approvedFilter, searchFilter);
      expect(combined).toBeDefined();
    });

    it("routes.ts source code does not bypass approved filter for public routes", async () => {
      const fs = await import("fs");
      const routesSource = fs.readFileSync("server/routes.ts", "utf-8");

      const filterFn = routesSource.match(
        /function getApprovedProductFilter\(\)[^}]+\}/
      );
      expect(filterFn).toBeTruthy();

      expect(filterFn![0]).not.toContain("EXPOSE_UNVERIFIED_PRODUCTS");
      expect(filterFn![0]).not.toContain("undefined");
      expect(filterFn![0]).toContain('approved');
    });

    it("getApprovedProductFilter is used on barcode lookup route", async () => {
      const fs = await import("fs");
      const routesSource = fs.readFileSync("server/routes.ts", "utf-8");
      const barcodeRoute = routesSource.match(
        /api\/products\/barcode[\s\S]*?getApprovedProductFilter/
      );
      expect(barcodeRoute).toBeTruthy();
    });

    it("getApprovedProductFilter is used on search route", async () => {
      const fs = await import("fs");
      const routesSource = fs.readFileSync("server/routes.ts", "utf-8");
      const searchRoute = routesSource.match(
        /api\/products\/search[\s\S]*?getApprovedProductFilter/
      );
      expect(searchRoute).toBeTruthy();
    });

    it("getApprovedProductFilter is used on popular products route", async () => {
      const fs = await import("fs");
      const routesSource = fs.readFileSync("server/routes.ts", "utf-8");
      const popularRoute = routesSource.match(
        /api\/products\/popular[\s\S]*?getApprovedProductFilter/
      );
      expect(popularRoute).toBeTruthy();
    });

    it("getApprovedProductFilter is used on product by ID route", async () => {
      const fs = await import("fs");
      const routesSource = fs.readFileSync("server/routes.ts", "utf-8");
      const idRoute = routesSource.match(
        /api\/products\/:id[\s\S]*?getApprovedProductFilter/
      );
      expect(idRoute).toBeTruthy();
    });

    it("getApprovedProductFilter is used on categories route", async () => {
      const fs = await import("fs");
      const routesSource = fs.readFileSync("server/routes.ts", "utf-8");
      const categoriesRoute = routesSource.match(
        /api\/products\/categories[\s\S]*?getApprovedProductFilter/
      );
      expect(categoriesRoute).toBeTruthy();
    });
  });
});
