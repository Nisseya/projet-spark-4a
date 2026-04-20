"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { Play, Square } from "lucide-react";

type Kind = "main" | "train" | "stats";

const DESCRIPTIONS: Record<Kind, string> = {
  main: "Traite toutes les vidéos en UPLOAD_COMPLETE (extraction + inférence + écriture Parquet).",
  train: "Entraîne un nouveau modèle Random Forest sur le dataset ASL et le sauvegarde sur S3.",
  stats: "Agrège toutes les frames traduites et génère les JSONs de statistiques.",
};

export default function AdminPage() {
  const { data: session, isPending } = useSession();
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState<Kind | null>(null);
  const [exitCode, setExitCode] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  async function run(kind: Kind) {
    if (running) return;
    setLogs([`>>> starting ${kind} at ${new Date().toLocaleTimeString()}...`]);
    setExitCode(null);
    setRunning(kind);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(apiUrl(`/api/admin/run/${kind}`), {
        method: "POST",
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const chunk of parts) handleChunk(chunk);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setLogs((l) => [...l, `>>> stream error: ${e.message ?? e}`]);
      }
    } finally {
      setRunning(null);
      abortRef.current = null;
    }

    function handleChunk(chunk: string) {
      const event = chunk.match(/^event: (.+)$/m)?.[1] ?? "log";
      const data = (chunk.match(/^data: (.*)$/m)?.[1] ?? "").replaceAll(
        "\\n",
        "\n"
      );
      if (event === "log") setLogs((l) => [...l, data]);
      else if (event === "start") setLogs((l) => [...l, `>>> started: ${data}`]);
      else if (event === "done") {
        setExitCode(data);
        setLogs((l) => [...l, `>>> exited with code ${data}`]);
      } else if (event === "error") {
        setLogs((l) => [...l, `>>> ERROR: ${data}`]);
      }
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  if (isPending) return <p className="text-sm text-zinc-500">Chargement…</p>;

  if (!session) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-400">
        Connexion requise.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Lance les jobs Spark — logs streamés en direct via SSE.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(["main", "train", "stats"] as Kind[]).map((k) => (
          <JobCard
            key={k}
            kind={k}
            description={DESCRIPTIONS[k]}
            running={running === k}
            disabled={!!running && running !== k}
            onRun={() => run(k)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-black/40">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                running
                  ? "animate-pulse bg-indigo-400"
                  : exitCode === "0"
                  ? "bg-emerald-400"
                  : exitCode !== null
                  ? "bg-red-400"
                  : "bg-zinc-600"
              }`}
            />
            <span className="font-mono text-zinc-400">
              {running
                ? `running: ${running}`
                : exitCode !== null
                ? `exit ${exitCode}`
                : "idle"}
            </span>
          </div>
          {running && (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20"
            >
              <Square className="h-3 w-3" />
              Déconnecter
            </button>
          )}
        </div>
        <pre
          ref={preRef}
          className="h-[28rem] overflow-auto px-4 py-3 font-mono text-xs leading-relaxed text-zinc-300"
        >
          {logs.length === 0 ? (
            <span className="text-zinc-600">↪ aucun log pour le moment</span>
          ) : (
            logs.join("\n")
          )}
        </pre>
      </div>

      <p className="text-xs text-zinc-500">
        Note : se déconnecter du stream ne tue pas le job sbt côté serveur, il
        continue de tourner jusqu'à la fin.
      </p>
    </div>
  );
}

function JobCard({
  kind,
  description,
  running,
  disabled,
  onRun,
}: {
  kind: Kind;
  description: string;
  running: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-sm text-indigo-400">{kind}</div>
          <div className="mt-1 text-xs text-zinc-500">sbt runMain {kindMain(kind)}</div>
        </div>
        <button
          onClick={onRun}
          disabled={disabled || running}
          className="flex items-center gap-1.5 rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="h-3 w-3" />
          {running ? "…" : "Run"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-400">
        {description}
      </p>
    </div>
  );
}

function kindMain(kind: Kind) {
  return {
    main: "Main",
    train: "TrainMain",
    stats: "StatsMain",
  }[kind];
}
