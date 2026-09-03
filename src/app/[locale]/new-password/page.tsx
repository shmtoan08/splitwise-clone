"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { NewPasswordSchema } from "@/schemas/auth.schema";
import { newPassword } from "@/actions/auth";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  KeyRound,
} from "lucide-react";

type NewPasswordFormValues = z.infer<typeof NewPasswordSchema>;

function NewPasswordFormContent() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordFormValues>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: NewPasswordFormValues) {
    setServerError(null);

    const result = await newPassword(data, token);

    if (!result.success) {
      setServerError(t(result.error as any));
    } else {
      setIsSuccess(true);
    }
  }

  // 1. Trường hợp URL thiếu token
  if (!token) {
    return (
      <Card className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
            {t("missing_token")}
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 leading-relaxed">
            {t("invalid_token")}
          </CardDescription>
        </div>
        <div className="pt-2 flex flex-col gap-3">
          <Link
            href="/forgot-password"
            className="w-full inline-flex items-center justify-center h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all active:scale-95"
          >
            {t("send_reset_link")}
          </Link>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center h-10 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {t("back_to_login")}
          </Link>
        </div>
      </Card>
    );
  }

  // 2. Trường hợp tạo mật khẩu mới thành công
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
            {t("new_password_success_title")}
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 leading-relaxed">
            {t("new_password_success_message")}
          </CardDescription>
        </div>
        <Button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 w-full font-medium shadow-sm active:scale-95 transition-all mt-2"
          onClick={() => router.push("/login")}
        >
          {t("login_now")}
        </Button>
      </Card>
    );
  }

  // 3. Form nhập mật khẩu mới
  return (
    <Card className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6 animate-in fade-in duration-200">
      <CardHeader className="text-center p-0 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
          <KeyRound className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
          {t("new_password_title")}
        </CardTitle>
        <CardDescription className="text-sm text-slate-500 leading-relaxed">
          {t("new_password_description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {serverError && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              {t("new_password_label")}
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                id="password"
                type="password"
                placeholder={t("new_password_placeholder")}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-600 focus-visible:bg-white pl-11 text-slate-900"
                {...register("password")}
              />
            </div>
            {errors.password?.message && (
              <p className="text-sm text-destructive">
                {t(errors.password.message as any)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-slate-700"
            >
              {t("confirm_new_password_label")}
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t("confirm_new_password_placeholder")}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-600 focus-visible:bg-white pl-11 text-slate-900"
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword?.message && (
              <p className="text-sm text-destructive">
                {t(errors.confirmPassword.message as any)}
              </p>
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
              <span>{t("new_password_button")}</span>
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
      </CardContent>
    </Card>
  );
}

export default function NewPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <Suspense
        fallback={
          <Card className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </Card>
        }
      >
        <NewPasswordFormContent />
      </Suspense>
    </div>
  );
}
