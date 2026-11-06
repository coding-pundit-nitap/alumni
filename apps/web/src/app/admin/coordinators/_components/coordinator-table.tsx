import {
  ConfirmButton,
  coordinatorPhotoUrl,
  type AccessAction,
  type ContactCoordinator,
} from "@/modules/admin";

import {
  CoordinatorDialog,
  type CoordinatorPhotoActions,
} from "./coordinator-dialog";

/** One row per person in a list, with edit and remove. */
export function CoordinatorTable(props: {
  coordinators: readonly ContactCoordinator[];
  saveAction: AccessAction;
  removeAction: AccessAction;
  photoActions: CoordinatorPhotoActions;
}) {
  if (props.coordinators.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-6 text-sm">
        Nobody listed yet. This group stays hidden on the contact page until
        someone is added.
      </p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-muted-foreground text-left text-xs">
        <tr className="border-b">
          <th scope="col" className="px-4 py-2 font-medium">
            Name
          </th>
          <th scope="col" className="px-4 py-2 font-medium">
            Email
          </th>
          <th scope="col" className="px-4 py-2 font-medium">
            Phone
          </th>
          <th scope="col" className="px-4 py-2">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {props.coordinators.map((c) => {
          const photo = coordinatorPhotoUrl(c);
          return (
            <tr key={c.id} className="border-b last:border-0">
              <th scope="row" className="px-4 py-3 text-left font-medium">
                <span className="flex items-center gap-3">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- redirects to a short-lived signed URL.
                    <img
                      src={photo}
                      alt=""
                      className="bg-muted size-9 shrink-0 rounded-full object-cover"
                    />
                  ) : null}
                  <span>
                    {c.name}
                    {c.designation ? (
                      <span className="text-muted-foreground block text-xs font-normal">
                        {c.designation}
                      </span>
                    ) : null}
                  </span>
                </span>
              </th>
              <td className="px-4 py-3">{c.email ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                {c.phone ?? "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <CoordinatorDialog
                    kind={c.kind}
                    label="Edit"
                    title={`Edit ${c.name}`}
                    coordinator={c}
                    action={props.saveAction}
                    photoActions={props.photoActions}
                  />
                  <ConfirmButton
                    label="Remove"
                    variant="destructive"
                    title={`Remove ${c.name}?`}
                    description="They will no longer appear on the contact page."
                    confirmLabel="Remove"
                    fields={{ id: c.id }}
                    action={props.removeAction}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
