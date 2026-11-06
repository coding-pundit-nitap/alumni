import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS, type Permission } from "@nitap/database/permissions";

import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import type { Actor } from "@/modules/auth";

import type { ContactCoordinator } from "../domain/contact-coordinator";
import type { CoordinatorStore, CoordinatorTx } from "./admin-store";
import {
  createAddContactCoordinator,
  createGetCoordinatorPhotoKey,
  createListContactCoordinators,
  createRemoveContactCoordinator,
  createUpdateContactCoordinator,
} from "./contact-coordinators";

const actor: Actor = {
  userId: "admin-1",
  accountState: "VERIFIED",
  requestId: "r",
  grants: [],
};
const ID = "0b8f6f4e-8f7e-4c2a-9f57-3a2a1f6d5c11";
const MISSING = "1b8f6f4e-8f7e-4c2a-9f57-3a2a1f6d5c11";
const PHOTO = "2b8f6f4e-8f7e-4c2a-9f57-3a2a1f6d5c11";
const NEW_PHOTO = "3b8f6f4e-8f7e-4c2a-9f57-3a2a1f6d5c11";
const existing: ContactCoordinator = {
  id: ID,
  kind: "FACULTY_COORDINATOR",
  name: "Dr. A. Rao",
  designation: "Assistant Professor, CSE",
  email: "rao@nitap.ac.in",
  phone: null,
  photoUploadId: PHOTO,
};
const input = {
  kind: "FACULTY_COORDINATOR",
  name: "Dr. A. Rao",
  designation: "Assistant Professor, CSE",
  email: "rao@nitap.ac.in",
  phone: null,
};

function setup(held: Permission[] = [PERMISSIONS.SYSTEM_CONFIGURE]) {
  const tx: CoordinatorTx = {
    findForUpdate: vi.fn(async (id: string) => (id === ID ? existing : null)),
    isReadyUpload: vi.fn(async (id: string) => id === NEW_PHOTO),
    create: vi.fn(async (values) => ({ id: ID, ...values })),
    update: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    audit: vi.fn(async () => {}),
  };
  const store: CoordinatorStore = {
    list: vi.fn(async () => [existing]),
    photoKey: vi.fn(async (id: string) =>
      id === ID ? "avatars/admin-1/photo.webp" : null
    ),
    transaction: vi.fn((fn) => fn(tx)),
  };
  const authorize = vi.fn((a: Actor | null, p: Permission) => {
    if (!a) throw new AuthenticationError();
    if (!held.includes(p)) throw new NotFoundError();
    return a;
  });
  const deps = { store, authorize };
  return {
    tx,
    store,
    authorize,
    list: createListContactCoordinators({ store }),
    photoKey: createGetCoordinatorPhotoKey({ store }),
    add: createAddContactCoordinator(deps),
    update: createUpdateContactCoordinator(deps),
    remove: createRemoveContactCoordinator(deps),
  };
}

describe("contact coordinators", () => {
  it("lists without an actor, for the public contact page", async () => {
    const { list, authorize } = setup();
    await expect(list()).resolves.toEqual([existing]);
    expect(authorize).not.toHaveBeenCalled();
  });

  it("conceals every write from anyone without system.configure", async () => {
    const { add, update, remove, store } = setup([]);
    await expect(add({ actor, input })).rejects.toBeInstanceOf(NotFoundError);
    await expect(update({ actor, id: ID, input })).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(remove({ actor, id: ID })).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("adds a coordinator and audits only the kind, never contact details", async () => {
    const { add, tx } = setup();
    await add({ actor, input: { ...input, designation: "  " } });
    expect(tx.create).toHaveBeenCalledWith(
      { ...input, designation: null, photoUploadId: null },
      "admin-1"
    );
    expect(tx.audit).toHaveBeenCalledWith({
      actorId: "admin-1",
      targetId: ID,
      metadata: { change: "added", kind: "FACULTY_COORDINATOR" },
    });
  });

  it("works from a form that left the optional fields out", async () => {
    const { add, tx } = setup();
    await add({
      actor,
      input: { kind: "STUDENT_COORDINATOR", name: "A", phone: "98765 43210" },
    });
    expect(tx.create).toHaveBeenCalledWith(
      {
        kind: "STUDENT_COORDINATOR",
        name: "A",
        designation: null,
        email: null,
        phone: "98765 43210",
        photoUploadId: null,
      },
      "admin-1"
    );
  });

  it.each([
    ["no name", { ...input, name: "  " }, "name"],
    ["a bad email", { ...input, email: "nope" }, "email"],
    ["a bad phone", { ...input, phone: "call me" }, "phone"],
    ["no way to reach them", { ...input, email: "", phone: "" }, "email"],
    ["an unknown kind", { ...input, kind: "STAFF" }, "kind"],
    ["a malformed photo id", { ...input, photoUploadId: "x" }, "photoUploadId"],
  ])("refuses %s", async (_label, bad, field) => {
    const { add, store } = setup();
    const error = await add({ actor, input: bad }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })])
    );
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("refuses a photo that is not a ready upload of the saving admin", async () => {
    const { add, tx } = setup();
    await expect(
      add({ actor, input: { ...input, photoUploadId: MISSING } })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(tx.isReadyUpload).toHaveBeenCalledWith(MISSING, "admin-1");
    expect(tx.create).not.toHaveBeenCalled();
  });

  it("updates and audits a real change, keeping a photo the form left out", async () => {
    const { update, tx } = setup();
    await expect(
      update({ actor, id: ID, input: { ...input, name: "Dr. A. Rao Jr" } })
    ).resolves.toEqual({ changed: true });
    expect(tx.update).toHaveBeenCalledWith(
      ID,
      { ...input, name: "Dr. A. Rao Jr", photoUploadId: PHOTO },
      "admin-1"
    );
    expect(tx.isReadyUpload).not.toHaveBeenCalled();
    expect(tx.audit).toHaveBeenCalledWith({
      actorId: "admin-1",
      targetId: ID,
      metadata: { change: "updated", kind: "FACULTY_COORDINATOR" },
    });
  });

  it("replaces and removes a photo", async () => {
    const { update, tx } = setup();
    await update({
      actor,
      id: ID,
      input: { ...input, photoUploadId: NEW_PHOTO },
    });
    expect(tx.update).toHaveBeenLastCalledWith(
      ID,
      { ...input, photoUploadId: NEW_PHOTO },
      "admin-1"
    );
    await update({ actor, id: ID, input: { ...input, photoUploadId: null } });
    expect(tx.update).toHaveBeenLastCalledWith(
      ID,
      { ...input, photoUploadId: null },
      "admin-1"
    );
  });

  it("an unchanged submit writes and audits nothing", async () => {
    const { update, tx } = setup();
    await expect(update({ actor, id: ID, input })).resolves.toEqual({
      changed: false,
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.audit).not.toHaveBeenCalled();
  });

  it("removes and audits", async () => {
    const { remove, tx } = setup();
    await remove({ actor, id: ID });
    expect(tx.remove).toHaveBeenCalledWith(ID);
    expect(tx.audit).toHaveBeenCalledWith({
      actorId: "admin-1",
      targetId: ID,
      metadata: { change: "removed", kind: "FACULTY_COORDINATOR" },
    });
  });

  it("404s a missing or malformed id, the malformed one before any read", async () => {
    const { update, remove, store } = setup();
    await expect(update({ actor, id: MISSING, input })).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(remove({ actor, id: MISSING })).rejects.toBeInstanceOf(
      NotFoundError
    );
    vi.mocked(store.transaction).mockClear();
    await expect(remove({ actor, id: "not-a-uuid" })).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("finds the photo publicly, and 404s when there is none", async () => {
    const { photoKey } = setup();
    await expect(photoKey({ id: ID })).resolves.toBe(
      "avatars/admin-1/photo.webp"
    );
    await expect(photoKey({ id: MISSING })).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(photoKey({ id: "nope" })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
