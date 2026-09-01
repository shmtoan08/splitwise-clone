import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("terms");

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-slate-700">
        
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> {t("backHome")}
        </Link>

        <div className="border-b border-slate-100 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold mb-3">
            <FileText className="w-4 h-4" /> {t("badge")}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("title")}
          </h1>
          <p className="text-xs text-slate-400 mt-1">{t("lastUpdated")}</p>
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
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm leading-relaxed flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>{t("sec2NoticeLabel")}</strong> {t("sec2Content")}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-1">
            {t("sec3Title")}
          </h2>
          <ul className="list-disc pl-5 text-sm space-y-1.5">
            <li>{t("sec3Item1")}</li>
            <li>{t("sec3Item2")}</li>
            <li>{t("sec3Item3")}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-1">
            {t("sec4Title")}
          </h2>
          <p className="text-sm">
            {t("sec4Content", { email: "shmtoan@gmail.com" })}
          </p>
        </section>

      </div>
    </div>
  );
}
