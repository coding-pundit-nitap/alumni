import { PERMISSIONS } from "@nitap/database/permissions";

import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Actor } from "@/modules/auth";

import {
  coordinatorInputSchema,
  type ContactCoordinator,
  type CoordinatorInput,
} from "../domain/contact-coordinator";
import { isUuid } from "../domain/user-query";
import type { CoordinatorStore, CoordinatorTx } from "./admin-store";
import type { Authorize } from "./authorize-port";
import { toValidationError } from "./validation";

type Deps = { store: CoordinatorStore; authorize: Authorize };

function parse(input: unknown): CoordinatorInput {
  const parsed = coordinatorInputSchema.safeParse(input);
  if (!parsed.success) throw toValidationError(parsed.error);
  return parsed.data;
}

/** Only a scanned image the saving admin uploaded can reach the public page. */
async function assertPhotoUsable(
  tx: CoordinatorTx,
  uploadId: string,
  ownerId: string
) {
  if (await tx.isReadyUpload(uploadId, ownerId)) return;
  throw new ValidationError({
    details: [
      {
        field: "photoUploadId",
        code: "INVALID",
        message: "That photo is not ready. Upload it again.",
      },
    ],
  });
}

/** Public: the contact page shows these to everyone, signed in or not. */
export function createListContactCoordinators(deps: Pick<Deps, "store">) {
  return async function listContactCoordinators(): Promise<
    ContactCoordinator[]
  > {
    return deps.store.list();
  };
}
export type ListContactCoordinators = ReturnType<
  typeof createListContactCoordinators
>;

/** Public, like the listing that links to it. */
export function createGetCoordinatorPhotoKey(deps: Pick<Deps, "store">) {
  return async function getCoordinatorPhotoKey(args: {
    id: string;
  }): Promise<string> {
    if (!isUuid(args.id)) throw new NotFoundError();
    const key = await deps.store.photoKey(args.id);
    if (!key) throw new NotFoundError();
    return key;
  };
}

export function createAddContactCoordinator(deps: Deps) {
  return async function addContactCoordinator(args: {
    actor: Actor | null;
    input: unknown;
  }): Promise<ContactCoordinator> {
    const actor = deps.authorize(args.actor, PERMISSIONS.SYSTEM_CONFIGURE, {
      concealed: true,
    });
    const values = parse(args.input);
    const photoUploadId = values.photoUploadId ?? null;

    return deps.store.transaction(async (tx) => {
      if (photoUploadId)
        await assertPhotoUsable(tx, photoUploadId, actor.userId);
      const created = await tx.create(
        { ...values, photoUploadId },
        actor.userId
      );
      await tx.audit({
        actorId: actor.userId,
        targetId: created.id,
        metadata: { change: "added", kind: created.kind },
      });
      return created;
    });
  };
}

/** An unchanged submit writes and audits nothing. */
export function createUpdateContactCoordinator(deps: Deps) {
  return async function updateContactCoordinator(args: {
    actor: Actor | null;
    id: string;
    input: unknown;
  }): Promise<{ changed: boolean }> {
    const actor = deps.authorize(args.actor, PERMISSIONS.SYSTEM_CONFIGURE, {
      concealed: true,
    });
    if (!isUuid(args.id)) throw new NotFoundError();
    const values = parse(args.input);

    return deps.store.transaction(async (tx) => {
      const row = await tx.findForUpdate(args.id);
      if (!row) throw new NotFoundError();
      const photoUploadId =
        values.photoUploadId === undefined
          ? row.photoUploadId
          : values.photoUploadId;
      if (
        row.kind === values.kind &&
        row.name === values.name &&
        row.designation === values.designation &&
        row.email === values.email &&
        row.phone === values.phone &&
        row.photoUploadId === photoUploadId
      )
        return { changed: false };

      if (photoUploadId && photoUploadId !== row.photoUploadId)
        await assertPhotoUsable(tx, photoUploadId, actor.userId);
      await tx.update(row.id, { ...values, photoUploadId }, actor.userId);
      await tx.audit({
        actorId: actor.userId,
        targetId: row.id,
        metadata: { change: "updated", kind: values.kind },
      });
      return { changed: true };
    });
  };
}

export function createRemoveContactCoordinator(deps: Deps) {
  return async function removeContactCoordinator(args: {
    actor: Actor | null;
    id: string;
  }): Promise<void> {
    const actor = deps.authorize(args.actor, PERMISSIONS.SYSTEM_CONFIGURE, {
      concealed: true,
    });
    if (!isUuid(args.id)) throw new NotFoundError();

    await deps.store.transaction(async (tx) => {
      const row = await tx.findForUpdate(args.id);
      if (!row) throw new NotFoundError();
      await tx.remove(row.id);
      await tx.audit({
        actorId: actor.userId,
        targetId: row.id,
        metadata: { change: "removed", kind: row.kind },
      });
    });
  };
}
