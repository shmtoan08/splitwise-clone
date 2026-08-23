"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  const t = useTranslations("Auth");

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("register_title")}</CardTitle>
          <CardDescription>{t("register_description")}</CardDescription>
        </CardHeader>
        
        <CardContent>
          <RegisterForm />
        </CardContent>

        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          {t("has_account")}{" "}
          <Link href="/login" className="ml-1 text-primary hover:underline">
            {t("login_link")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
