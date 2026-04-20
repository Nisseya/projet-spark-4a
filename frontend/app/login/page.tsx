"use client";

import { signIn, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { data } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (data?.user) router.replace("/videos");
  }, [data, router]);

  return (
    <div className="mx-auto mt-20 max-w-sm">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Connecte-toi avec ton compte Google pour accéder au pipeline.
        </p>

        <button
          onClick={() =>
            signIn.social({ provider: "google", callbackURL: "/videos" })
          }
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-900"
        >
          <GoogleIcon />
          Continuer avec Google
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.5-1.7 4.4-5.5 4.4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.8 14.7 3 12 3 6.5 3 2 7.5 2 13s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
      />
    </svg>
  );
}
