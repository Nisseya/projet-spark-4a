const STATUS_STYLES: Record<string, string> = {
  DONE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/30",
  PROCESSING: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  EXTRACTING: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  UPLOAD_COMPLETE: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  UPLOAD_STARTED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

export default function StatusPill({ status }: { status: string }) {
  const cls =
    STATUS_STYLES[status] ??
    "bg-zinc-800 text-zinc-400 border-zinc-700";
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${cls}`}>
      {status}
    </span>
  );
}
