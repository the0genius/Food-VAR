import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  timestamp,
  jsonb,
  serial,
  boolean,
  index,
  uniqueIndex,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull().default(""),
  age: integer("age"),
  gender: text("gender"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  conditions: jsonb("conditions").$type<string[]>().default([]),
  conditionsOther: text("conditions_other"),
  allergies: jsonb("allergies").$type<string[]>().default([]),
  allergiesOther: text("allergies_other"),
  dietaryPreference: text("dietary_preference"),
  goal: text("goal"),
  profileClusterId: text("profile_cluster_id"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  isPro: boolean("is_pro").default(false),
  role: text("role").default("user"),
  contributionCount: integer("contribution_count").default(0),
  emailVerifiedAt: timestamp("email_verified_at"),
  consentPolicyVersion: text("consent_policy_version"),
  consentAiVersion: text("consent_ai_version"),
  consentAcceptedAt: timestamp("consent_accepted_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index("refresh_tokens_user_idx").on(table.userId),
    index("refresh_tokens_hash_idx").on(table.tokenHash),
  ]
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    barcode: text("barcode").notNull().unique(),
    name: text("name").notNull(),
    brand: text("brand").default(""),
    category: text("category").default(""),
    servingSize: text("serving_size"),
    calories: real("calories"),
    protein: real("protein"),
    carbohydrates: real("carbohydrates"),
    sugar: real("sugar"),
    fat: real("fat"),
    saturatedFat: real("saturated_fat"),
    fiber: real("fiber"),
    sodium: real("sodium"),
    allergens: jsonb("allergens").$type<string[]>().default([]),
    declaredAllergens: jsonb("declared_allergens").$type<string[]>().default([]),
    inferredAllergens: jsonb("inferred_allergens").$type<string[]>().default([]),
    ingredients: text("ingredients"),
    nutritionFacts: jsonb("nutrition_facts").$type<Record<string, number | string | null>>(),
    extractionConfidence: jsonb("extraction_confidence").$type<{
      overall: string;
      fields: Record<string, string>;
    }>(),
    frontImageUrl: text("front_image_url"),
    nutritionImageUrl: text("nutrition_image_url"),
    contributedBy: integer("contributed_by"),
    source: text("source").default("user"),
    moderationStatus: text("moderation_status").default("pending"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: integer("verified_by"),
    reportCount: integer("report_count").default(0),
    scanCount: integer("scan_count").default(0),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index("products_name_idx").on(table.name),
    index("products_brand_idx").on(table.brand),
    index("products_category_idx").on(table.category),
    uniqueIndex("products_barcode_idx").on(table.barcode),
  ]
);

export const scanHistory = pgTable(
  "scan_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    adviceText: text("advice_text"),
    headline: text("headline"),
    coachTip: text("coach_tip"),
    highlights: jsonb("highlights").$type<string[]>().default([]),
    profileClusterId: text("profile_cluster_id"),
    scoringVersion: text("scoring_version"),
    accessMethod: text("access_method").notNull().default("scan"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index("scan_history_user_idx").on(table.userId),
    index("scan_history_product_idx").on(table.productId),
  ]
);

export const adviceCache = pgTable(
  "advice_cache",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    profileClusterId: text("profile_cluster_id").notNull(),
    adviceText: text("advice_text").notNull(),
    headline: text("headline"),
    coachTip: text("coach_tip"),
    highlights: jsonb("highlights").$type<string[]>().default([]),
    promptVersion: text("prompt_version"),
    modelVersion: text("model_version"),
    scoringVersion: text("scoring_version"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    index("advice_cache_lookup_idx").on(table.productId, table.profileClusterId),
  ]
);

export const scoringRules = pgTable("scoring_rules", {
  id: serial("id").primaryKey(),
  nutrient: text("nutrient").notNull(),
  condition: text("condition").notNull(),
  lowerThreshold: real("lower_threshold").notNull(),
  upperThreshold: real("upper_threshold").notNull(),
  minDeduction: real("min_deduction").notNull(),
  maxDeduction: real("max_deduction").notNull(),
  isBonus: boolean("is_bonus").default(false),
  active: boolean("active").default(true),
});

export const dailyScanTracker = pgTable(
  "daily_scan_tracker",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    scanDate: date("scan_date", { mode: "string" }).notNull(),
  },
  (table) => [
    index("daily_scan_tracker_user_date_idx").on(table.userId, table.scanDate),
    uniqueIndex("daily_scan_unique_idx").on(
      table.userId,
      table.productId,
      table.scanDate
    ),
  ]
);

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New Chat"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index("conversations_user_idx").on(table.userId),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId),
    index("messages_user_idx").on(table.userId),
  ]
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index("email_verification_user_idx").on(table.userId),
    index("email_verification_hash_idx").on(table.tokenHash),
  ]
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    index("password_reset_user_idx").on(table.userId),
    index("password_reset_hash_idx").on(table.tokenHash),
  ]
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ScanHistory = typeof scanHistory.$inferSelect;
export type AdviceCache = typeof adviceCache.$inferSelect;
export type ScoringRule = typeof scoringRules.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
