import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PERMISSIONS } from "@nitap/database/permissions";

import {
  completePhotoUploadAction,
  getUploadStatusAction,
  presignPhotoUploadAction,
} from "@/app/(app)/profile/photo-actions";
import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-surface";
import { listContactCoordinators } from "@/composition/admin";
import { COORDINATOR_GROUPS } from "@/modules/admin";
import { can, getActor } from "@/modules/auth";

import { CoordinatorDialog } from "./_components/coordinator-dialog";
import { CoordinatorTable } from "./_components/coordinator-table";
import { removeCoordinatorAction, saveCoordinatorAction } from "./actions";

export const metadata: Metadata = { title: "Coordinators" };

const photoActions = {
  presignAction: presignPhotoUploadAction,
  completeAction: completePhotoUploadAction,
  statusAction: getUploadStatusAction,
};

/** 404 without system.configure. */
export default async function AdminCoordinatorsPage() {
  const actor = await getActor();
  if (!actor || !can(actor, PERMISSIONS.SYSTEM_CONFIGURE)) notFound();
  const coordinators = await listContactCoordinators();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Coordinators"
        description="The people listed on the public contact page. Every change is audited."
      />
      {COORDINATOR_GROUPS.map((group) => (
        <AdminPanel
          key={group.kind}
          title={group.title}
          actions={
            <CoordinatorDialog
              kind={group.kind}
              label="Add"
              title={`Add a ${group.singular} coordinator`}
              action={saveCoordinatorAction}
              photoActions={photoActions}
            />
          }
        >
          <CoordinatorTable
            coordinators={coordinators.filter((c) => c.kind === group.kind)}
            saveAction={saveCoordinatorAction}
            removeAction={removeCoordinatorAction}
            photoActions={photoActions}
          />
        </AdminPanel>
      ))}
    </div>
  );
}
