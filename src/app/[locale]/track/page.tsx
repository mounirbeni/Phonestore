import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { isLocale } from "@/lib/i18n";
import { TrackForm } from "@/components/shop/track-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).track.title } : {};
}

export default async function TrackPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  return (
    <div className="container-x pb-10 pt-8 sm:pt-12">
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{d.track.title}</h1>
        <p className="mb-8 mt-3 text-muted">{d.track.text}</p>
        <TrackForm />
      </div>
    </div>
  );
}
