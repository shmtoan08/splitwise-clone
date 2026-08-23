"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoginSchema } from "@/schemas/auth.schema";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock } from "lucide-react";

type LoginFormValues = z.infer<typeof LoginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormValues) {
    setServerError(null);
    const result = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    if (result?.error) {
      setServerError(t("invalid_credentials"));
    } else {
      router.refresh();
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-slate-700">{t("email_label")}</Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input 
            id="email" 
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
        <Label htmlFor="password" className="text-sm font-medium text-slate-700">{t("password_label")}</Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input 
            id="password" 
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
          t("login_button")
        )}
      </Button>
    </form>
  );
}
