import { z } from "zod";

export const RegisterSchema = z
  .object({
    email: z.string().email("invalid_email"),
    password: z.string().min(6, "password_too_short"),
    confirmPassword: z.string(),
    locale: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwords_do_not_match",
    path: ["confirmPassword"],
  });

export const LoginSchema = z.object({
  email: z.string().email("invalid_email"),
  password: z.string().min(1, "required_password"),
});
