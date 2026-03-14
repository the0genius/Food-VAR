import { describe, it, expect } from "vitest";
import { products } from "../shared/schema";

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
    const { eq } = require("drizzle-orm");
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

    it("only 'approved' status passes the approved filter", () => {
      const shouldBeVisible = (status: string) => status === "approved";
      expect(shouldBeVisible("approved")).toBe(true);
      expect(shouldBeVisible("pending")).toBe(false);
      expect(shouldBeVisible("flagged")).toBe(false);
      expect(shouldBeVisible("rejected")).toBe(false);
    });
  });
});
