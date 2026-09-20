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
import { Link } from "@/i18n/routing";

type LoginFormValues = z.infer<typeof LoginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

export function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
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
      if (
        result.error.includes("email_not_verified") ||
        (result as any).code === "email_not_verified" ||
        (result as any).url?.includes("error=email_not_verified")
      ) {
        setServerError(t("email_not_verified"));
      } else {
        setServerError(t("invalid_credentials"));
      }
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-semibold text-slate-700">{t("email_label")}</Label>
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
          <Input 
            id="email" 
            type="email" 
            placeholder={t("email_placeholder")}
            className="h-12 rounded-xl border-slate-200 bg-slate-50/80 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 focus-visible:bg-white pl-11 transition-all"
            {...register("email")}
          />
        </div>
        {errors.email?.message && (
          <p className="text-sm text-destructive font-medium">{t(errors.email.message as any)}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-semibold text-slate-700">{t("password_label")}</Label>
          <Link
            href="/forgot-password"
            onClick={onForgotPassword}
            className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium transition-colors"
          >
            {t("forgot_password_link")}
          </Link>
        </div>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
          <Input 
            id="password" 
            type="password" 
            placeholder={t("password_placeholder")}
            className="h-12 rounded-xl border-slate-200 bg-slate-50/80 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 focus-visible:bg-white pl-11 transition-all"
            {...register("password")}
          />
        </div>
        {errors.password?.message && (
          <p className="text-sm text-destructive font-medium">{t(errors.password.message as any)}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm font-medium text-destructive bg-destructive/10 text-destructive-foreground p-3 rounded-lg border border-destructive/20">{serverError}</p>
      )}

      <Button type="submit" className="w-full h-11 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-md hover:shadow-lg active:scale-95 transition-all mt-2" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t("loading")}
          </>
        ) : (
          t("login_button")
        )}
      </Button>
    </form>
  );
}

