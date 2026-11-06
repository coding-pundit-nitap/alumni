import type { Prisma, PrismaClient } from "@nitap/database";
import type { AuditWriter } from "@nitap/database/audit";

import type { TransactionRunner } from "@/infrastructure/database/transaction-runner";

import type {
  CoordinatorStore,
  CoordinatorTx,
} from "../application/admin-store";
import type { CoordinatorKind } from "../domain/contact-coordinator";

const SELECT = {
  id: true,
  kind: true,
  name: true,
  designation: true,
  email: true,
  phone: true,
  photoUploadId: true,
} as const;

/**
 * `contact_coordinator` reads, and locked writes audited in the same
 * transaction.
 */
export function createPrismaCoordinatorStore(deps: {
  db: PrismaClient;
  runner: Pick<TransactionRunner, "run">;
  audit: AuditWriter;
}): CoordinatorStore {
  const forClient = (db: Prisma.TransactionClient): CoordinatorTx => ({
    async findForUpdate(id) {
      const rows = await db.$queryRaw<
        {
          id: string;
          kind: CoordinatorKind;
          name: string;
          designation: string | null;
          email: string | null;
          phone: string | null;
          photo_upload_id: string | null;
        }[]
      >`
        SELECT id, kind::text AS kind, name, designation, email, phone, photo_upload_id
          FROM contact_coordinator
         WHERE id = ${id}::uuid FOR UPDATE`;
      const row = rows[0];
      if (!row) return null;
      const { photo_upload_id: photoUploadId, ...rest } = row;
      return { ...rest, photoUploadId };
    },

    async isReadyUpload(id, ownerId) {
      const count = await db.upload.count({
        where: { id, ownerId, status: "READY" },
      });
      return count > 0;
    },

    create: (values, actorId) =>
      db.contactCoordinator.create({
        data: { ...values, updatedBy: actorId },
        select: SELECT,
      }),

    async update(id, values, actorId) {
      await db.contactCoordinator.update({
        where: { id },
        data: { ...values, updatedBy: actorId, updatedAt: new Date() },
      });
    },

    async remove(id) {
      await db.contactCoordinator.delete({ where: { id } });
    },

    async audit({ actorId, targetId, metadata }) {
      await deps.audit.record(db, {
        action: "config.changed",
        actorId,
        targetType: "contact_coordinator",
        targetId,
        metadata,
      });
    },
  });

  return {
    list: () =>
      deps.db.contactCoordinator.findMany({
        select: SELECT,
        orderBy: [{ kind: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      }),
    async photoKey(id) {
      const row = await deps.db.contactCoordinator.findUnique({
        where: { id },
        select: { photo: { select: { objectKey: true, status: true } } },
      });
      return row?.photo?.status === "READY" ? row.photo.objectKey : null;
    },
    transaction: (work) => deps.runner.run((db) => work(forClient(db))),
  };
}
