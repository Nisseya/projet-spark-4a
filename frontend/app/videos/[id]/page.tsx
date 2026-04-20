"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl, fetchJsonl } from "@/lib/api";
import StatCard from "@/components/stat-card";

type Annotation = { frame_idx: number; ts_ms: number; translation: string };

type VideoRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  created_by: string;
  video_url: string;
  annotations_url: string | null;
};

export default function VideoPage({ params }: { params: { id: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<VideoRow | null>(null);
  const [anns, setAnns] = useState<Annotation[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const v = await fetch(apiUrl(`/api/videos/${params.id}`)).then((r) => {
          if (!r.ok) throw new Error(`video ${r.status}`);
          return r.json();
        });
        setVideo(v);

        if (v.annotations_url) {
          const a = await fetchJsonl<Annotation>(v.annotations_url);
          a.sort((x, y) => x.ts_ms - y.ts_ms);
          setAnns(a);
        }
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || anns.length === 0) return;

    const onTime = () => {
      const t = el.currentTime * 1000;
      let idx = -1;
      for (let i = 0; i < anns.length; i++) {
        if (anns[i].ts_ms <= t) idx = i;
        else break;
      }
      setCurrentIdx(idx);
    };

    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [anns]);

  const currentLetter = currentIdx >= 0 ? anns[currentIdx].translation : "–";

  const progressiveWord = useMemo(() => {
    if (currentIdx < 0) return "";
    const letters: string[] = [];
    let prev = "";
    for (let i = 0; i <= currentIdx; i++) {
      const l = anns[i].translation;
      if (l !== "undefined" && l !== prev) letters.push(l);
      prev = l;
    }
    return letters.join("");
  }, [currentIdx, anns]);

  const fullWord = useMemo(() => {
    const letters: string[] = [];
    let prev = "";
    for (const a of anns) {
      if (a.translation !== "undefined" && a.translation !== prev) {
        letters.push(a.translation);
      }
      prev = a.translation;
    }
    return letters.join("");
  }, [anns]);

  const distribution = useMemo(() => {
    const d: Record<string, number> = {};
    for (const a of anns) d[a.translation] = (d[a.translation] ?? 0) + 1;
    return Object.entries(d).sort((a, b) => b[1] - a[1]);
  }, [anns]);

  const durationMs = anns.length ? anns[anns.length - 1].ts_ms : 0;
  const distinctLetters = new Set(
    anns.map((a) => a.translation).filter((l) => l !== "undefined")
  ).size;

  if (loading) return <p className="text-sm text-zinc-500">Chargement…</p>;
  if (error || !video) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-400">
        Erreur : {error ?? "vidéo introuvable"}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{video.name}</h1>
        <p className="mt-1 font-mono text-xs text-zinc-500">{video.id}</p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black">
        <video
          ref={videoRef}
          src={video.video_url}
          controls
          className="w-full"
          preload="metadata"
        />
        <div className="pointer-events-none absolute bottom-16 right-6 rounded-md bg-indigo-500/90 px-5 py-3 font-mono text-3xl font-semibold tabular-nums shadow-lg backdrop-blur">
          {currentLetter}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="text-xs uppercase tracking-wider text-zinc-500">
          Mot en cours
        </div>
        <div className="mt-2 min-h-[2.5rem] font-mono text-3xl font-semibold tracking-wider text-zinc-100">
          {progressiveWord || <span className="text-zinc-700">–</span>}
        </div>
        {fullWord && fullWord !== progressiveWord && (
          <div className="mt-3 text-xs text-zinc-500">
            Prédiction complète :{" "}
            <span className="font-mono text-zinc-400">{fullWord}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Frames" value={anns.length.toLocaleString("fr-FR")} />
        <StatCard label="Durée" value={`${(durationMs / 1000).toFixed(1)} s`} />
        <StatCard label="Lettres distinctes" value={distinctLetters} />
        <StatCard
          label="FPS estimée"
          value={
            durationMs > 0
              ? ((anns.length / durationMs) * 1000).toFixed(1)
              : "–"
          }
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Distribution
        </h2>
        <div className="flex flex-wrap gap-2">
          {distribution.map(([letter, count]) => (
            <span
              key={letter}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm"
            >
              <span
                className={`font-mono ${
                  letter === "undefined" ? "text-zinc-500" : "text-indigo-400"
                }`}
              >
                {letter}
              </span>
              <span className="font-mono text-xs text-zinc-500">{count}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
