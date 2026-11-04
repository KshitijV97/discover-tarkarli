"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SessionUser } from "@/lib/server/session";
import { signOutAction } from "./actions";

const NAV = [
  { href: "/#rooms", label: "Rooms" },
  { href: "/#experiences", label: "Experiences" },
  { href: "/#kitchen", label: "Kitchen" },
  { href: "/food", label: "Local food" },
  { href: "/#pets", label: "Dog friendly" },
  { href: "/#gallery", label: "Gallery" },
];

export function Header({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);

  const transparent = overHero && !scrolled && !open;
  const tone = transparent ? "text-white" : "text-foreground";

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${transparent ? "bg-transparent" : "glass-light shadow-card"}`}>
      <div className={`container-page flex h-16 items-center justify-between ${tone}`}>
        <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-semibold">
          <motion.span aria-hidden className="relative inline-block h-7 w-7 overflow-hidden rounded-pill bg-gradient-to-br from-gold via-accent to-primary"
            whileHover={{ rotate: 180 }} transition={{ type: "spring", stiffness: 120 }}>
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-white/25" />
          </motion.span>
          Golden Tide
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`rounded-pill px-3 py-2 text-sm font-medium transition ${transparent ? "hover:bg-white/10" : "hover:bg-surface-muted"}`}>{n.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative hidden md:block">
              <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu}
                className={`flex items-center gap-2 rounded-pill py-1 pl-1 pr-3 text-sm font-medium transition ${transparent ? "hover:bg-white/10" : "hover:bg-surface-muted"}`}>
                <Avatar user={user} />
                <span className="max-w-28 truncate">{user.name?.split(" ")[0] ?? "Account"}</span>
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="absolute right-0 mt-2 w-52 overflow-hidden rounded-card border border-border bg-surface p-1.5 text-foreground shadow-raised">
                    <MenuLink href="/account">My bookings</MenuLink>
                    {(user.role === "staff" || user.role === "admin") && <MenuLink href="/admin">Admin</MenuLink>}
                    <form action={signOutAction}><button className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted">Sign out</button></form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href={`/signin?callbackUrl=${encodeURIComponent(pathname || "/")}`}
              className={`hidden rounded-pill px-3 py-2 text-sm font-medium transition md:inline-flex ${transparent ? "hover:bg-white/10" : "hover:bg-surface-muted"}`}>Sign in</Link>
          )}
          <Link href="/book" className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-card transition hover:bg-accent/90">Book a stay</Link>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-pill md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span className="relative block h-3 w-5">
              <motion.span className="absolute left-0 top-0 h-0.5 w-5 rounded bg-current" animate={open ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }} />
              <motion.span className="absolute bottom-0 left-0 h-0.5 w-5 rounded bg-current" animate={open ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }} />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border md:hidden">
            <div className="container-page space-y-1 py-4">
              {NAV.map((n, i) => (
                <motion.div key={n.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 font-heading text-xl">{n.label}</Link>
                </motion.div>
              ))}
              <div className="mt-2 border-t border-border pt-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2"><Avatar user={user} /><span className="text-sm">{user.email}</span></div>
                    <Link href="/account" className="block rounded-md px-3 py-3">My bookings</Link>
                    {(user.role === "staff" || user.role === "admin") && <Link href="/admin" className="block rounded-md px-3 py-3">Admin</Link>}
                    <form action={signOutAction}><button className="w-full rounded-md px-3 py-3 text-left">Sign out</button></form>
                  </>
                ) : (
                  <Link href="/signin" className="block rounded-md px-3 py-3 font-medium text-primary">Sign in</Link>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="block rounded-md px-3 py-2 text-sm hover:bg-surface-muted">{children}</Link>;
}

export function Avatar({ user, size = 28 }: { user: Pick<SessionUser, "name" | "image">; size?: number }) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-pill object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="grid place-items-center rounded-pill bg-primary text-xs font-semibold text-primary-foreground" style={{ width: size, height: size }}>
      {(user.name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}
