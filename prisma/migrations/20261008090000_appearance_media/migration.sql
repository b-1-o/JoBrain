-- Appearance tokens on profile + reduced motion preference
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "glassBlur" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "panelOpacity" INTEGER NOT NULL DEFAULT 72;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "borderIntensity" INTEGER NOT NULL DEFAULT 40;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "reducedMotion" BOOLEAN NOT NULL DEFAULT false;
