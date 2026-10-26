"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Dict } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import type { ArtKind } from "@/lib/art";
import { store } from "@/config/store";

/* ---------- i18n ---------- */

type I18n = { locale: Locale; d: Dict };
const I18nContext = createContext<I18n | null>(null);

export function useI18n() {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}

/* ---------- cart ---------- */

export type CartLine = {
  variantId: number;
  slug: string;
  name: string;
  variantLabel: { fr: string; ar: string };
  colorHex: string;
  image: string | null;
  art: ArtKind;
  price: number;
  compareAt: number | null;
  qty: number;
  stock: number;
};

type CartApi = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
};

const CartContext = createContext<CartApi | null>(null);
const CART_KEY = "ps_cart_v1";
const WISH_KEY = "ps_wish_v1";

export function useCart() {
  const v = useContext(CartContext);
  if (!v) throw new Error("useCart outside provider");
  return v;
}

function clampQty(qty: number, stock: number) {
  return Math.max(1, Math.min(Math.floor(qty) || 1, stock, store.maxQtyPerLine));
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: cart stays in memory for this session */
  }
}

/* ---------- ui ---------- */

type UiApi = { menuOpen: boolean; setMenuOpen: (v: boolean) => void };
const UiContext = createContext<UiApi | null>(null);

export function useUi() {
  const v = useContext(UiContext);
  if (!v) throw new Error("useUi outside provider");
  return v;
}

/* ---------- wishlist ---------- */

type WishApi = { slugs: string[]; has: (slug: string) => boolean; toggle: (slug: string) => void };
const WishContext = createContext<WishApi | null>(null);

export function useWishlist() {
  const v = useContext(WishContext);
  if (!v) throw new Error("useWishlist outside provider");
  return v;
}

export function Providers({ locale, d, children }: { locale: Locale; d: Dict; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ui = useMemo<UiApi>(() => ({ menuOpen, setMenuOpen }), [menuOpen]);

  useEffect(() => {
    setLines(readJSON<CartLine[]>(CART_KEY, []).filter((l) => l && l.variantId && l.qty > 0));
    setSlugs(readJSON<string[]>(WISH_KEY, []));
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setLines(readJSON<CartLine[]>(CART_KEY, []));
      if (e.key === WISH_KEY) setSlugs(readJSON<string[]>(WISH_KEY, []));
    };
    window.addEventListener("storage", onStorage);
    // Minimal service worker so the store can be installed like an app.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (ready) writeJSON(CART_KEY, lines);
  }, [lines, ready]);
  useEffect(() => {
    if (ready) writeJSON(WISH_KEY, slugs);
  }, [slugs, ready]);

  const add = useCallback<CartApi["add"]>((line, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.variantId === line.variantId);
      if (i === -1) return [...prev, { ...line, qty: clampQty(qty, line.stock) }];
      const next = [...prev];
      next[i] = { ...next[i], ...line, qty: clampQty(next[i].qty + qty, line.stock) };
      return next;
    });
  }, []);

  const setQty = useCallback((variantId: number, qty: number) => {
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, qty: clampQty(qty, l.stock) } : l)));
  }, []);
  const remove = useCallback((variantId: number) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)), []);
  const clear = useCallback(() => setLines([]), []);

  const cart = useMemo<CartApi>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.price * l.qty, 0),
      add,
      setQty,
      remove,
      replace: setLines,
      clear,
      drawerOpen,
      setDrawerOpen,
    }),
    [lines, ready, add, setQty, remove, clear, drawerOpen],
  );

  const wish = useMemo<WishApi>(
    () => ({
      slugs,
      has: (slug) => slugs.includes(slug),
      toggle: (slug) => setSlugs((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [slug, ...p])),
    }),
    [slugs],
  );

  return (
    <I18nContext.Provider value={{ locale, d }}>
      <CartContext.Provider value={cart}>
        <WishContext.Provider value={wish}>
          <UiContext.Provider value={ui}>{children}</UiContext.Provider>
        </WishContext.Provider>
      </CartContext.Provider>
    </I18nContext.Provider>
  );
}
