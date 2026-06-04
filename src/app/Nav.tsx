"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function Nav() {
  const [name, setName] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setName(d.player?.name ?? null))
      .catch(() => setName(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    setName(null);
    router.push("/");
  }

  const link = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
          active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="bg-pitch text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
        <Link href="/" className="mr-2 flex items-center gap-3">
          <Logo variant="light" />
          <span className="hidden md:inline text-white/40">|</span>
          <span className="hidden md:inline text-sm font-medium text-white/85">
            World Cup 2026 Pool
          </span>
        </Link>
        {name && (
          <>
            {link("/predict", "Predict")}
            {link("/bonus", "Knockout picks")}
            {link("/leaderboard", "Leaderboard")}
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {link("/admin", "Admin")}
          {name ? (
            <button
              onClick={logout}
              className="text-sm text-white/80 hover:text-white px-2"
              title="Log out"
            >
              {name} · Log out
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
