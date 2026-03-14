import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Feature Flags", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("defaults ENABLE_AI_ADVICE to true when env is unset", async () => {
    vi.stubEnv("ENABLE_AI_ADVICE", "");
    const { FeatureFlags } = await import("../server/feature-flags");
    expect(FeatureFlags.ENABLE_AI_ADVICE).toBe(true);
  });

  it("ENABLE_AI_ADVICE can be disabled with 'false'", async () => {
    vi.stubEnv("ENABLE_AI_ADVICE", "false");
    const { FeatureFlags } = await import("../server/feature-flags");
    expect(FeatureFlags.ENABLE_AI_ADVICE).toBe(false);
  });

  it("defaults ENABLE_CHAT to false when env is unset", async () => {
    vi.stubEnv("ENABLE_CHAT", "");
    const { FeatureFlags } = await import("../server/feature-flags");
    expect(FeatureFlags.ENABLE_CHAT).toBe(false);
  });

  it("ENABLE_CHAT can be enabled with 'true'", async () => {
    vi.stubEnv("ENABLE_CHAT", "true");
    const { FeatureFlags } = await import("../server/feature-flags");
    expect(FeatureFlags.ENABLE_CHAT).toBe(true);
  });

  it("isFeatureEnabled returns the flag value", async () => {
    vi.stubEnv("ENABLE_CHAT", "true");
    const { isFeatureEnabled } = await import("../server/feature-flags");
    expect(isFeatureEnabled("ENABLE_CHAT")).toBe(true);
  });
});
