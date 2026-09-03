"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { useTranslations } from "next-intl";
import { LogIn, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { Link } from "@/i18n/routing";

interface AuthModalProps {
  triggerText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
}

export function AuthModal({ triggerText, variant = "default", className }: AuthModalProps) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<"login" | "register">("login");
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const t = useTranslations("Auth");

  const title = view === "login" ? t("login_title") : t("register_title");
  const description = view === "login" ? t("login_description") : t("register_description");
  const triggerLabel = triggerText || t("login_title");

  const handleSuccess = () => {
    setOpen(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err) {
      console.error("Google sign in error:", err);
      setIsGoogleLoading(false);
    }
  };

  const triggerButtonClasses = buttonVariants({ 
    variant, 
    className: `rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all ${className || ""}` 
  });

  const triggerContent = (
    <span className="flex items-center gap-2">
      <LogIn className="w-4 h-4" />
      <span>{triggerLabel}</span>
    </span>
  );

  const formContent = (
    <div className="px-4 pb-4 md:px-0 md:pb-0">
      {view === "login" ? (
        <LoginForm
          onSuccess={handleSuccess}
          onForgotPassword={() => setOpen(false)}
        />
      ) : (
        <RegisterForm onSuccess={handleSuccess} onGoToLogin={() => setView("login")} />
      )}

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400 font-normal">{t("or_continue_with")}</span>
        </div>
      </div>

      <Button 
        variant="outline" 
        disabled={isGoogleLoading}
        className="w-full h-11 rounded-full bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-medium shadow-sm flex items-center justify-center gap-3 mt-4 active:scale-95 transition-all"
        onClick={handleGoogleSignIn}
      >
        {isGoogleLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            <span>{t("loading")}</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>{t("continue_with_google")}</span>
          </>
        )}
      </Button>

      <div className="mt-6 text-center text-sm text-slate-500">
        {view === "login" ? (
          <div className="space-y-2">
            <div>
              <Link
                href="/forgot-password"
                onClick={() => setOpen(false)}
                className="text-xs text-slate-500 hover:text-blue-600 hover:underline transition-colors"
              >
                {t("forgot_password_link")}
              </Link>
            </div>
            <div>
              {t("no_account")}{" "}
              <button
                type="button"
                className="text-primary font-bold hover:underline"
                onClick={() => setView("register")}
              >
                {t("register_link")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {t("has_account")}{" "}
            <button
              type="button"
              className="text-primary font-bold hover:underline"
              onClick={() => setView("login")}
            >
              {t("login_link")}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={triggerButtonClasses}>
        {triggerContent}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-3xl p-6 sm:p-8">
        <DialogHeader className="text-center mb-2">
          <DialogTitle className="text-2xl font-normal text-slate-900 text-center">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
