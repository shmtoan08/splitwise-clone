"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { verifyEmail } from "@/actions/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, LogIn } from "lucide-react";

function VerifyEmailContent() {
  const t = useTranslations("VerifyEmail");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<("loading" | "success" | "error")>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    if (!token) {
      setStatus("error");
      setErrorMessage("missing_token");
      return;
    }

    async function handleVerify() {
      const result = await verifyEmail(token!);
      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(result.error || "system_error");
      }
    }
    handleVerify();
  }, [token]);

  return (
    <Card className="w-full max-w-md shadow-lg border-slate-200/80 rounded-3xl p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold text-slate-900">
          {t("title")}
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          {t("description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center py-6 text-center space-y-4">
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <p className="text-sm font-medium text-slate-600 animate-pulse">
              {t("verifying")}
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5 px-2">
              <h3 className="text-lg font-bold text-emerald-800">
                {t("success_title")}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t("success_description")}
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
              <XCircle className="w-9 h-9" />
            </div>
            <div className="space-y-1.5 px-2">
              <h3 className="text-lg font-bold text-rose-800">
                {t("error_title")}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {errorMessage ? t(errorMessage as any) : t("system_error")}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2.5 pt-2">
        {status === "success" ? (
          <Link
            href="/login"
            className={cn(
              buttonVariants({
                className: "w-full h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2",
              })
            )}
          >
            <LogIn className="w-4 h-4" />
            <span>{t("go_to_login")}</span>
          </Link>
        ) : (
          <Link
            href="/"
            className={cn(
              buttonVariants({
                variant: "outline",
                className: "w-full h-11 rounded-full border-slate-200 hover:bg-slate-50 font-medium text-sm active:scale-95 transition-all flex items-center justify-center gap-2 text-slate-700",
              })
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("back_to_home")}</span>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50/60">
      <Suspense
        fallback={
          <Card className="w-full max-w-md shadow-lg border-slate-200/80 rounded-3xl p-6 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 my-8" />
          </Card>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
