export const FeatureFlags = {
  ENABLE_AI_ADVICE: envBool("ENABLE_AI_ADVICE", true),
  ENABLE_CHAT: envBool("ENABLE_CHAT", false),
  ENABLE_IMAGE_GENERATION: envBool("ENABLE_IMAGE_GENERATION", false),
  EXPOSE_UNVERIFIED_PRODUCTS: envBool("EXPOSE_UNVERIFIED_PRODUCTS", false),
  ENABLE_TRUSTED_CONTRIBUTOR_BYPASS: envBool("ENABLE_TRUSTED_CONTRIBUTOR_BYPASS", false),
} as const;

function envBool(key: string, defaultVal: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return defaultVal;
  return v === "true" || v === "1";
}

export function isFeatureEnabled(flag: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[flag];
}
