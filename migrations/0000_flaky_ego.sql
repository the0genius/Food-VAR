CREATE TABLE "advice_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"profile_cluster_id" text NOT NULL,
	"advice_text" text NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"prompt_version" text,
	"model_version" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_scan_tracker" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"scan_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"barcode" text NOT NULL,
	"name" text NOT NULL,
	"brand" text DEFAULT '',
	"category" text DEFAULT '',
	"serving_size" text,
	"calories" real,
	"protein" real,
	"carbohydrates" real,
	"sugar" real,
	"fat" real,
	"saturated_fat" real,
	"fiber" real,
	"sodium" real,
	"allergens" jsonb DEFAULT '[]'::jsonb,
	"declared_allergens" jsonb DEFAULT '[]'::jsonb,
	"inferred_allergens" jsonb DEFAULT '[]'::jsonb,
	"ingredients" text,
	"nutrition_facts" jsonb,
	"front_image_url" text,
	"nutrition_image_url" text,
	"contributed_by" integer,
	"source" text DEFAULT 'user',
	"moderation_status" text DEFAULT 'pending',
	"verified_at" timestamp,
	"verified_by" integer,
	"report_count" integer DEFAULT 0,
	"scan_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "products_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"score" integer NOT NULL,
	"advice_text" text,
	"headline" text,
	"coach_tip" text,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"profile_cluster_id" text,
	"scoring_version" text,
	"access_method" text DEFAULT 'scan' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"nutrient" text NOT NULL,
	"condition" text NOT NULL,
	"lower_threshold" real NOT NULL,
	"upper_threshold" real NOT NULL,
	"min_deduction" real NOT NULL,
	"max_deduction" real NOT NULL,
	"is_bonus" boolean DEFAULT false,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text DEFAULT '' NOT NULL,
	"age" integer,
	"gender" text,
	"height_cm" real,
	"weight_kg" real,
	"conditions" jsonb DEFAULT '[]'::jsonb,
	"conditions_other" text,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"allergies_other" text,
	"dietary_preference" text,
	"goal" text,
	"profile_cluster_id" text,
	"onboarding_completed" boolean DEFAULT false,
	"is_pro" boolean DEFAULT false,
	"role" text DEFAULT 'user',
	"contribution_count" integer DEFAULT 0,
	"email_verified_at" timestamp,
	"consent_policy_version" text,
	"consent_ai_version" text,
	"consent_accepted_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "advice_cache" ADD CONSTRAINT "advice_cache_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_scan_tracker" ADD CONSTRAINT "daily_scan_tracker_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_scan_tracker" ADD CONSTRAINT "daily_scan_tracker_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advice_cache_lookup_idx" ON "advice_cache" USING btree ("product_id","profile_cluster_id");--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "daily_scan_tracker_user_date_idx" ON "daily_scan_tracker" USING btree ("user_id","scan_date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_scan_unique_idx" ON "daily_scan_tracker" USING btree ("user_id","product_id","scan_date");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "products_barcode_idx" ON "products" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "scan_history_user_idx" ON "scan_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scan_history_product_idx" ON "scan_history" USING btree ("product_id");