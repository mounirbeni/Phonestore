"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useI18n, useWishlist, useCart } from "@/components/providers";
import { getWishlistCards } from "@/app/actions/shop";
import type { CardProduct } from "@/db/queries";
import { ProductGrid } from "./product-card";
import { localePath } from "@/lib/i18n";

export function WishlistView() {
  const { locale, d } = useI18n();
  const wish = useWishlist();
  const { ready } = useCart();
  const [items, setItems] = useState<CardProduct[] | null>(null);
  const key = wish.slugs.join(",");

  useEffect(() => {
    if (!ready) return;
    if (!wish.slugs.length) {
      setItems([]);
      return;
    }
    let alive = true;
    getWishlistCards(wish.slugs).then((r) => alive && setItems(r));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  if (items === null) return <div className="min-h-[30vh]" aria-busy="true" />;
  const visible = items.filter((i) => wish.slugs.includes(i.slug));
  if (!visible.length) {
    return (
      <div className="grid place-items-center py-20 text-center">
        <div>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-mist"><Heart className="h-9 w-9 text-muted" aria-hidden="true" /></span>
          <h2 className="mt-6 text-xl font-bold">{d.wishlist.empty}</h2>
          <p className="mt-2 text-sm text-muted">{d.wishlist.emptyHint}</p>
          <Link href={localePath(locale, "/shop")} className="btn btn-primary btn-lg mt-8">{d.common.continueShopping}</Link>
        </div>
      </div>
    );
  }
  return <ProductGrid items={visible} locale={locale} d={d} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" />;
}
