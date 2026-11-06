-- People listed on the public contact page. They are published contacts, not accounts.
CREATE TYPE "CoordinatorKind" AS ENUM ('FACULTY_COORDINATOR', 'STUDENT_COORDINATOR');

CREATE TABLE "contact_coordinator" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "CoordinatorKind" NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "photo_upload_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "contact_coordinator_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_coordinator_name" CHECK (char_length("name") BETWEEN 1 AND 200),
    CONSTRAINT "ck_coordinator_reachable" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL)
);

CREATE INDEX "contact_coordinator_kind_created_at_idx" ON "contact_coordinator"("kind", "created_at");

ALTER TABLE "contact_coordinator" ADD CONSTRAINT "contact_coordinator_photo_upload_id_fkey" FOREIGN KEY ("photo_upload_id") REFERENCES "upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_coordinator" ADD CONSTRAINT "contact_coordinator_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
