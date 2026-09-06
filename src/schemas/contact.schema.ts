import { z } from "zod";

export const AddContactSchema = z.object({
  name: z.string().trim().min(1, "contact_name_required").max(50, "contact_name_too_long"),
  email: z.string().trim().email("invalid_email").optional().or(z.literal("")),
});

export type AddContactInput = z.infer<typeof AddContactSchema>;
