import { z } from "zod";

export const COORDINATOR_GROUPS = [
  {
    kind: "FACULTY_COORDINATOR",
    title: "Faculty coordinators",
    singular: "faculty",
  },
  {
    kind: "STUDENT_COORDINATOR",
    title: "Student coordinators",
    singular: "student",
  },
] as const;

export type CoordinatorKind = (typeof COORDINATOR_GROUPS)[number]["kind"];

export type ContactCoordinator = {
  id: string;
  kind: CoordinatorKind;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  photoUploadId: string | null;
};
export type CoordinatorValues = Omit<ContactCoordinator, "id">;

/** A blank field means "not given". */
const optional = <T extends z.ZodType>(field: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value ?? null;
    return value.trim() || null;
  }, field.nullable());

/**
 * Published on a public page, so every listing needs a way to reach them. An
 * absent `photoUploadId` keeps the current photo; null removes it.
 */
export const coordinatorInputSchema = z
  .object({
    kind: z.enum(["FACULTY_COORDINATOR", "STUDENT_COORDINATOR"]),
    name: z
      .string()
      .trim()
      .min(1, "Enter a name.")
      .max(200, "At most 200 characters."),
    designation: optional(z.string().max(200, "At most 200 characters.")),
    email: optional(
      z
        .string()
        .max(254, "At most 254 characters.")
        .email("Enter a valid email address.")
    ),
    phone: optional(
      z
        .string()
        .regex(/^\+?[0-9][0-9 ()-]{5,29}$/, "Enter a valid phone number.")
    ),
    photoUploadId: z.uuid().nullable().optional(),
  })
  .strict()
  .refine((input) => input.email !== null || input.phone !== null, {
    path: ["email"],
    message: "Add an email address or a phone number.",
  });
export type CoordinatorInput = z.infer<typeof coordinatorInputSchema>;

export const telHref = (phone: string) =>
  `tel:${phone.replace(/[^+0-9]/g, "")}`;

export const coordinatorPhotoUrl = (coordinator: ContactCoordinator) =>
  coordinator.photoUploadId
    ? `/api/coordinators/${coordinator.id}/photo?v=${coordinator.photoUploadId}`
    : null;
