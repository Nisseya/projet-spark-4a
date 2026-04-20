"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/videos", label: "Mes vidéos" },
  { href: "/tops", label: "Tops" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
            <span className="text-zinc-100">ASL</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400">Pipeline</span>
          </Link>
          <nav className="flex gap-5 text-sm">
            {LINKS.map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    active
                      ? "text-zinc-100"
                      : "text-zinc-500 transition-colors hover:text-zinc-200"
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {data?.user ? (
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/users/${data.user.id}`}
              className="text-zinc-400 hover:text-zinc-200"
            >
              {data.user.email}
            </Link>
            <button
              onClick={() => signOut()}
              className="rounded-md border border-zinc-800 px-3 py-1 text-zinc-300 transition-colors hover:bg-zinc-900"
            >
              Déconnexion
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
          >
            Se connecter
          </Link>
        )}
      </div>
    </header>
  );
}
