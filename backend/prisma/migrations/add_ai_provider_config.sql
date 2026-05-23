-- Migration to add AI Provider Configuration table
-- This stores encrypted API keys and provider settings

CREATE TABLE IF NOT EXISTS "AiProviderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "provider" VARCHAR(50) NOT NULL UNIQUE,
    "apiKey" TEXT NULL,  -- Encrypted API key
    "model" VARCHAR(100) NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastTested" DATETIME NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on provider for faster lookups
CREATE INDEX IF NOT EXISTS "AiProviderConfig_provider_idx" ON "AiProviderConfig"("provider");

-- Insert default configurations for known providers
INSERT OR IGNORE INTO "AiProviderConfig" ("provider", "enabled") VALUES
('openai', false),
('anthropic', false),
('google', false),
('cohere', false);