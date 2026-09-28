ALTER TABLE "ResearchDocument" ADD COLUMN "doi" TEXT,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "evidencePassage" TEXT,
ADD COLUMN "evidenceLocation" TEXT,
ADD COLUMN "materialLevel" TEXT,
ADD COLUMN "verification" TEXT,
ADD COLUMN "evidenceLimitations" TEXT;

CREATE TABLE "ProjectFact" (
 "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "description" TEXT NOT NULL, "evidenceReference" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ProjectFact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectFact_projectId_idx" ON "ProjectFact"("projectId");
ALTER TABLE "ProjectFact" ADD CONSTRAINT "ProjectFact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WritingRun" (
 "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL, "sourceRunId" TEXT, "chapterNumber" INTEGER, "variant" TEXT NOT NULL,
 "pipelineVersion" TEXT NOT NULL DEFAULT 'academic-v1', "settings" JSONB NOT NULL DEFAULT '{}',
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "snapshot" JSONB NOT NULL, "snapshotHash" TEXT NOT NULL,
 "stages" JSONB NOT NULL DEFAULT '{}', "findings" JSONB NOT NULL DEFAULT '[]',
 "versions" JSONB NOT NULL DEFAULT '[]', "published" JSONB NOT NULL DEFAULT '{}', "metrics" JSONB NOT NULL DEFAULT '{}',
 "error" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "WritingRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WritingRun_projectId_idempotencyKey_key" ON "WritingRun"("projectId", "idempotencyKey");
CREATE INDEX "WritingRun_projectId_createdAt_idx" ON "WritingRun"("projectId", "createdAt");
ALTER TABLE "WritingRun" ADD CONSTRAINT "WritingRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DetectorMeasurement" (
 "id" TEXT NOT NULL, "runId" TEXT NOT NULL, "detectorName" TEXT NOT NULL,
 "detectorVersion" TEXT, "measuredAt" TIMESTAMP(3) NOT NULL,
 "rawResult" JSONB NOT NULL, "testedTextHash" TEXT NOT NULL,
 "testedVersion" TEXT NOT NULL, "limitations" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DetectorMeasurement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DetectorMeasurement_runId_idx" ON "DetectorMeasurement"("runId");
ALTER TABLE "DetectorMeasurement" ADD CONSTRAINT "DetectorMeasurement_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WritingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
