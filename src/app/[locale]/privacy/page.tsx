import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft, ShieldCheck, Mail, Globe } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-slate-700">
        
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> {t("backHome")}
        </Link>

        <div className="border-b border-slate-100 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold mb-3">
            <ShieldCheck className="w-4 h-4" /> {t("badge")}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("title")}
          </h1>
          <p className="text-xs text-slate-400 mt-1">{t("lastUpdated")}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-sm space-y-1.5">
          <p>
            <strong>{t("appLabel")}</strong> {t("appName")}
          </p>
          <p>
            <strong>{t("domainLabel")}</strong> {t("domainValue")}
          </p>
          <p>
            <strong>{t("emailLabel")}</strong> {t("emailValue")}
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-1">
            {t("sec1Title")}
          </h2>
          <p className="text-sm leading-relaxed">
            {t("sec1Content", { domain: "https://wari.ezjlpt.com" })}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-1">
            {t("sec2Title")}
          </h2>
          <p className="text-sm leading-relaxed">{t("sec2Intro")}</p>
          <ul className="list-disc pl-5 text-sm space-y-1.5">
            <li>
              <strong>Email (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">userinfo.email</code>):</strong> {t("sec2Email")}
            </li>
            <li>
              <strong>Họ tên / Name (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">userinfo.profile</code>):</strong> {t("sec2Profile")}
            </li>
            <li>
              <strong>OpenID (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">openid</code>):</strong> {t("sec2Openid")}
            </li>
            <li>
              <strong>Device Token:</strong> {t("sec2DeviceToken")}
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-1">
            {t("sec3Title")}
          </h2>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-sm leading-relaxed">
            {t("sec3Content")}{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="underline font-bold hover:text-emerald-700"
            >
              {t("sec3PolicyLinkText")}
            </a>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-1">
            {t("sec4Title")}
          </h2>
          <p className="text-sm leading-relaxed">
            {t("sec4Content", { email: "shmtoan@gmail.com" })}
          </p>
        </section>

      </div>
    </div>
  );
}
