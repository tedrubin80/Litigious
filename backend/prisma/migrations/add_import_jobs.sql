-- LMS migration import jobs and external ID audit trail

CREATE TABLE IF NOT EXISTS "import_jobs" (
  "id" TEXT NOT NULL,
  "sourceId" VARCHAR(50) NOT NULL,
  "importMode" VARCHAR(20) NOT NULL DEFAULT 'api',
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "entitiesRequested" JSONB NOT NULL,
  "progress" JSONB NOT NULL,
  "errors" JSONB NOT NULL DEFAULT '[]',
  "dryRun" BOOLEAN NOT NULL DEFAULT true,
  "preview" JSONB,
  "authConfig" JSONB,
  "csvMeta" JSONB,
  "startedAt" TIMESTAMPTZ(6),
  "completedAt" TIMESTAMPTZ(6),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "import_jobs_sourceId_idx" ON "import_jobs"("sourceId");
CREATE INDEX IF NOT EXISTS "import_jobs_status_idx" ON "import_jobs"("status");
CREATE INDEX IF NOT EXISTS "import_jobs_createdById_idx" ON "import_jobs"("createdById");
CREATE INDEX IF NOT EXISTS "import_jobs_createdAt_idx" ON "import_jobs"("createdAt");

CREATE TABLE IF NOT EXISTS "import_external_mappings" (
  "id" TEXT NOT NULL,
  "importJobId" TEXT NOT NULL,
  "entityType" VARCHAR(30) NOT NULL,
  "externalId" VARCHAR(255) NOT NULL,
  "externalSource" VARCHAR(50) NOT NULL,
  "internalId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_external_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_external_mappings_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "import_external_mappings_importJobId_entityType_externalId_externalSource_key"
  ON "import_external_mappings"("importJobId", "entityType", "externalId", "externalSource");
CREATE INDEX IF NOT EXISTS "import_external_mappings_externalId_externalSource_idx"
  ON "import_external_mappings"("externalId", "externalSource");
CREATE INDEX IF NOT EXISTS "import_external_mappings_entityType_idx" ON "import_external_mappings"("entityType");
