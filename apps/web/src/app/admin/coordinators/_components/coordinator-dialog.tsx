"use client";

import { useId, useState, type ComponentProps } from "react";

import { Input } from "@nitap/ui/components/input";

import {
  ConfirmButton,
  coordinatorPhotoUrl,
  type AccessAction,
  type ContactCoordinator,
  type CoordinatorKind,
} from "@/modules/admin";
import { PhotoUpload } from "@/modules/uploads/client";

export type CoordinatorPhotoActions = Pick<
  ComponentProps<typeof PhotoUpload>,
  "presignAction" | "completeAction" | "statusAction"
>;

/** Add a coordinator, or edit `coordinator` when given. */
export function CoordinatorDialog(props: {
  kind: CoordinatorKind;
  label: string;
  title: string;
  coordinator?: ContactCoordinator;
  action: AccessAction;
  photoActions: CoordinatorPhotoActions;
}) {
  const { coordinator } = props;
  const nameId = useId();
  const designationId = useId();
  const emailId = useId();
  const phoneId = useId();
  const [name, setName] = useState(coordinator?.name ?? "");
  const [designation, setDesignation] = useState(
    coordinator?.designation ?? ""
  );
  const [email, setEmail] = useState(coordinator?.email ?? "");
  const [phone, setPhone] = useState(coordinator?.phone ?? "");
  const [photoUploadId, setPhotoUploadId] = useState<string>();
  const [removePhoto, setRemovePhoto] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setName(coordinator?.name ?? "");
    setDesignation(coordinator?.designation ?? "");
    setEmail(coordinator?.email ?? "");
    setPhone(coordinator?.phone ?? "");
    setPhotoUploadId(undefined);
    setRemovePhoto(false);
    setUploading(false);
  };

  const fields = [
    {
      id: nameId,
      label: "Name",
      value: name,
      set: setName,
      maxLength: 200,
    },
    {
      id: designationId,
      label: "Designation",
      value: designation,
      set: setDesignation,
      maxLength: 200,
      placeholder: "e.g. Assistant Professor, CSE",
    },
    {
      id: emailId,
      label: "Email",
      value: email,
      set: setEmail,
      maxLength: 254,
      type: "email",
    },
    {
      id: phoneId,
      label: "Phone",
      value: phone,
      set: setPhone,
      maxLength: 30,
      type: "tel",
    },
  ];
  const existingPhoto = coordinator ? coordinatorPhotoUrl(coordinator) : null;

  return (
    <ConfirmButton
      label={props.label}
      title={props.title}
      description="This appears on the public contact page. Add an email address or a phone number."
      confirmLabel="Save"
      fields={{
        id: coordinator?.id,
        kind: props.kind,
        name,
        designation,
        email,
        phone,
        photoUploadId,
        removePhoto: removePhoto ? "true" : undefined,
      }}
      ready={
        !uploading &&
        name.trim() !== "" &&
        (email.trim() !== "" || phone.trim() !== "")
      }
      action={props.action}
      onClose={reset}
    >
      <div className="flex max-h-[60svh] flex-col gap-4 overflow-y-auto pr-1">
        {fields.map((field) => (
          <div key={field.id} className="flex flex-col gap-1">
            <label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
            </label>
            <Input
              id={field.id}
              type={field.type}
              value={field.value}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              onChange={(e) => field.set(e.target.value)}
            />
          </div>
        ))}
        <PhotoUpload
          photoUrl={removePhoto ? null : existingPhoto}
          photoAlt={`Photo of ${coordinator?.name ?? "the coordinator"}`}
          {...props.photoActions}
          onReady={(uploadId) => {
            setPhotoUploadId(uploadId);
            setRemovePhoto(false);
          }}
          onBusyChange={setUploading}
        />
        {existingPhoto ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={removePhoto}
              onChange={(e) => {
                setRemovePhoto(e.target.checked);
                if (e.target.checked) setPhotoUploadId(undefined);
              }}
            />
            Remove the current photo
          </label>
        ) : null}
      </div>
    </ConfirmButton>
  );
}
