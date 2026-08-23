"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { RegisterSchema } from "@/schemas/auth.schema";
import { registerUser } from "@/actions/auth";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type RegisterFormValues = z.infer<typeof RegisterSchema>;

interface RegisterFormProps {
  onSuccess?: () => void;
  onGoToLogin?: () => void;
}

export function RegisterForm({ onSuccess, onGoToLogin }: RegisterFormProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: RegisterFormValues) {
    setServerError(null);
    const result = await registerUser(data);

    if (!result.success) {
      setServerError(t(result.error as any));
    } else {
      // Auto login after register
      const loginResult = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (!loginResult?.error) {
        router.refresh();
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/");
        }
      } else {
        if (onGoToLogin) onGoToLogin();
        else router.push("/login");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-email" className="text-sm font-medium text-slate-700">{t("email_label")}</Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input 
            id="reg-email" 
            type="email" 
            placeholder={t("email_placeholder")}
            className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-600 focus-visible:bg-white pl-11"
            {...register("email")}
          />
        </div>
        {errors.email?.message && (
          <p className="text-sm text-destructive">{t(errors.email.message as any)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password" className="text-sm font-medium text-slate-700">{t("password_label")}</Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input 
            id="reg-password" 
            type="password" 
            placeholder={t("password_placeholder")}
            className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-600 focus-visible:bg-white pl-11"
            {...register("password")}
          />
        </div>
        {errors.password?.message && (
          <p className="text-sm text-destructive">{t(errors.password.message as any)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-confirmPassword" className="text-sm font-medium text-slate-700">{t("confirm_password_label")}</Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input 
            id="reg-confirmPassword" 
            type="password" 
            placeholder={t("confirm_password_placeholder")}
            className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-600 focus-visible:bg-white pl-11"
            {...register("confirmPassword")}
          />
        </div>
        {errors.confirmPassword?.message && (
          <p className="text-sm text-destructive">{t(errors.confirmPassword.message as any)}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm font-medium text-destructive">{serverError}</p>
      )}

      <Button type="submit" className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-base shadow-sm active:scale-95 transition-all" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("loading")}
          </>
        ) : (
          t("register_button")
        )}
      </Button>
    </form>
  );
}
