"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const t = useTranslations("Auth");

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("login_title")}</CardTitle>
          <CardDescription>{t("login_description")}</CardDescription>
        </CardHeader>
        
        <CardContent>
          <LoginForm />
        </CardContent>

        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          {t("no_account")}{" "}
          <Link href="/register" className="ml-1 text-primary hover:underline">
            {t("register_link")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
