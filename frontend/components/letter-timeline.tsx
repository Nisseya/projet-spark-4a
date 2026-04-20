"use client";

import { useMemo } from "react";

type Annotation = { frame_idx: number; ts_ms: number; translation: string };

type Segment = {
  letter: string;
  startMs: number;
  endMs: number;
  durationMs: number;
};

// Couleurs stables à partir du hash du nom de la lettre
function colorForLetter(letter: string): string {
  if (letter === "undefined") return "#3f3f46";
  let h = 0;
  for (let i = 0; i < letter.length; i++) {
    h = (h * 31 + letter.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 65%, 58%)`;
}

export default function LetterTimeline({
  annotations,
  currentTimeMs,
  onSeek,
}: {
  annotations: Annotation[];
  currentTimeMs?: number;
  onSeek?: (ms: number) => void;
}) {
  const { segments, totalMs } = useMemo(() => {
    if (annotations.length === 0) return { segments: [], totalMs: 0 };
    const sorted = [...annotations].sort((a, b) => a.ts_ms - b.ts_ms);
    const total = sorted[sorted.length - 1].ts_ms;

    const segs: Segment[] = [];
    let current: Segment | null = null;
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const end =
        i + 1 < sorted.length ? sorted[i + 1].ts_ms : total + 200; // petite queue à la fin
      if (current && current.letter === a.translation) {
        current.endMs = end;
        current.durationMs = current.endMs - current.startMs;
      } else {
        if (current) segs.push(current);
        current = {
          letter: a.translation,
          startMs: a.ts_ms,
          endMs: end,
          durationMs: end - a.ts_ms,
        };
      }
    }
    if (current) segs.push(current);
    return { segments: segs, totalMs: total };
  }, [annotations]);

  if (segments.length === 0 || totalMs === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Timeline des lettres
        </div>
        <div className="mt-4 text-sm text-zinc-500">Aucune annotation.</div>
      </div>
    );
  }

  const cursorPct =
    currentTimeMs !== undefined
      ? Math.max(0, Math.min(100, (currentTimeMs / totalMs) * 100))
      : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Timeline des lettres
        </div>
        <div className="font-mono text-xs text-zinc-600">
          {segments.length} segments · {(totalMs / 1000).toFixed(1)}s
        </div>
      </div>

      {/* Barre */}
      <div className="relative">
        <div className="flex h-10 w-full overflow-hidden rounded-md bg-zinc-950">
          {segments.map((seg, i) => {
            const pct = (seg.durationMs / totalMs) * 100;
            const bg = colorForLetter(seg.letter);
            const title = `${seg.letter} · ${(seg.startMs / 1000).toFixed(
              1
            )}s → ${(seg.endMs / 1000).toFixed(1)}s`;
            return (
              <button
                key={i}
                onClick={() => onSeek?.(seg.startMs)}
                title={title}
                className="group relative flex items-center justify-center overflow-hidden text-[10px] font-mono font-semibold text-black/80 transition-all hover:brightness-110"
                style={{ width: `${pct}%`, backgroundColor: bg }}
              >
                {pct > 3 && seg.letter !== "undefined" && (
                  <span className="truncate px-1">{seg.letter}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Curseur temps réel */}
        {cursorPct !== null && (
          <div
            className="pointer-events-none absolute top-0 h-10 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{ left: `${cursorPct}%` }}
          />
        )}

        {/* Axe du temps */}
        <div className="mt-2 flex justify-between font-mono text-[10px] text-zinc-600">
          <span>0.0s</span>
          <span>{(totalMs / 2000).toFixed(1)}s</span>
          <span>{(totalMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Légende unique */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {Array.from(new Set(segments.map((s) => s.letter)))
          .filter((l) => l !== "undefined")
          .sort()
          .map((letter) => (
            <span
              key={letter}
              className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-xs"
            >
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: colorForLetter(letter) }}
              />
              <span className="font-mono">{letter}</span>
            </span>
          ))}
      </div>
    </div>
  );
}
