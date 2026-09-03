"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { ResetPasswordSchema } from "@/schemas/auth.schema";
import { resetPassword } from "@/actions/auth";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle2, ArrowLeft, KeyRound } from "lucide-react";

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    setServerError(null);
    const result = await resetPassword(data.email, locale);

    if (!result.success) {
      setServerError(t(result.error as any));
    } else {
      setIsSuccess(true);
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {t("reset_email_sent_title")}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t("reset_email_sent")}
            </p>
          </div>

          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 w-full font-medium shadow-sm active:scale-95 transition-all mt-2"
            onClick={() => router.push("/login")}
          >
            {t("back_to_login")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6 animate-in fade-in duration-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("forgot_password_title")}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t("forgot_password_description")}
          </p>
        </div>

        {serverError && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              {t("email_label")}
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                id="email"
                type="email"
                placeholder={t("email_placeholder")}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-600 focus-visible:bg-white pl-11 text-slate-900"
                {...register("email")}
              />
            </div>
            {errors.email?.message && (
              <p className="text-sm text-destructive">{t(errors.email.message as any)}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 w-full font-medium shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all mt-4"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>{t("loading")}</span>
              </>
            ) : (
              <span>{t("send_reset_link")}</span>
            )}
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("back_to_login")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
