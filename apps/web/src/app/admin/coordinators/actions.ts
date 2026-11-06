"use server";

import { runAction } from "@/app/_actions/run-action";
import {
  addContactCoordinator,
  removeContactCoordinator,
  updateContactCoordinator,
} from "@/composition/admin";
import type { ActionResult } from "@/lib/action-result";
import { assertFormData } from "@/lib/form-data";
import { getActor } from "@/modules/auth";

/** With an `id` this edits that person; without one it adds a new person. */
export async function saveCoordinatorAction(
  form: FormData
): Promise<ActionResult<unknown>> {
  return runAction(async () => {
    assertFormData(form);
    const photoUploadId = form.get("photoUploadId");
    const input = {
      kind: form.get("kind") ?? undefined,
      name: form.get("name") ?? undefined,
      designation: form.get("designation"),
      email: form.get("email"),
      phone: form.get("phone"),
      ...(form.get("removePhoto") === "true"
        ? { photoUploadId: null }
        : photoUploadId
          ? { photoUploadId }
          : {}),
    };
    const actor = await getActor();
    const id = form.get("id");
    return id
      ? updateContactCoordinator({ actor, id: String(id), input })
      : addContactCoordinator({ actor, input });
  });
}

export async function removeCoordinatorAction(
  form: FormData
): Promise<ActionResult<unknown>> {
  return runAction(async () => {
    assertFormData(form);
    await removeContactCoordinator({
      actor: await getActor(),
      id: String(form.get("id") ?? ""),
    });
    return { removed: true };
  });
}
