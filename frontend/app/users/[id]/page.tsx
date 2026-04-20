"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { api, fetchJsonl } from "@/lib/api";
import StatCard from "@/components/stat-card";
import LetterBars from "@/components/letter-bars";
import DonutChart from "@/components/donut-chart";
import RadialGauge from "@/components/radial-gauge";

type PerUser = {
  user_id: string;
  nb_videos: number;
  total_frames: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  avg_frames_per_video: number;
  letter_distribution: Record<string, number>;
  top_letter: string | null;
};

type Global = {
  total_videos: number;
  total_frames: number;
  total_duration_ms: number;
};

function formatDuration(ms: number) {
  if (!ms) return "0 s";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)} min`;
  return `${(m / 60).toFixed(1)} h`;
}

export default function UserPage({ params }: { params: { id: string } }) {
  const { data: session, isPending } = useSession();
  const [user, setUser] = useState<PerUser | null>(null);
  const [global, setGlobal] = useState<Global | null>(null);
  const [loading, setLoading] = useState(true);

  const isSelf = session?.user?.id === params.id;

  useEffect(() => {
    if (!isSelf) return;
    (async () => {
      try {
        const [{ url: userUrl }, { url: globalUrl }] = await Promise.all([
          api<{ url: string }>("/api/stats/per-user"),
          api<{ url: string }>("/api/stats/global"),
        ]);
        const [userRows, globalRows] = await Promise.all([
          fetchJsonl<PerUser>(userUrl),
          fetchJsonl<Global>(globalUrl),
        ]);
        setUser(userRows.find((r) => r.user_id === params.id) ?? null);
        setGlobal(globalRows[0] ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, isSelf]);

  if (isPending) return <p className="text-sm text-zinc-500">Chargement…</p>;

  if (!isSelf) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-400">
        Accès refusé — tu ne peux voir que tes propres statistiques.
      </div>
    );
  }

  if (loading) return <p className="text-sm text-zinc-500">Chargement…</p>;

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mes statistiques
        </h1>
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center">
          <p className="text-sm text-zinc-300">
            Aucune statistique pour le moment.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Uploade et traite une vidéo, puis régénère les stats (Admin → Run
            stats).
          </p>
        </div>
      </div>
    );
  }

  const letters = Object.entries(user.letter_distribution ?? {})
    .filter(([k]) => k !== "undefined")
    .map(([letter, count]) => ({ letter, count: Number(count) }))
    .sort((a, b) => b.count - a.count);

  const donutSlices = letters
    .slice(0, 8)
    .map(({ letter, count }) => ({ name: letter, value: count }));

  // % relatifs vs global
  const videosShare = global?.total_videos
    ? (user.nb_videos / global.total_videos) * 100
    : 0;
  const framesShare = global?.total_frames
    ? (user.total_frames / global.total_frames) * 100
    : 0;
  const durationShare = global?.total_duration_ms
    ? (user.total_duration_ms / global.total_duration_ms) * 100
    : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Mes statistiques
        </h1>
        <p className="mt-1 font-mono text-xs text-zinc-500">
          {session?.user?.email}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Vidéos" value={user.nb_videos} />
        <StatCard
          label="Frames totales"
          value={user.total_frames.toLocaleString("fr-FR")}
        />
        <StatCard
          label="Durée cumulée"
          value={formatDuration(user.total_duration_ms)}
        />
        <StatCard
          label="Lettre dominante"
          value={
            user.top_letter ? (
              <span className="text-indigo-400">{user.top_letter}</span>
            ) : (
              "–"
            )
          }
        />
      </div>

      {/* Part relative globale */}
      {global && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
            Ma part dans le pipeline global
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <RadialGauge
              label="Vidéos"
              value={videosShare}
              sublabel={`${user.nb_videos} / ${global.total_videos}`}
            />
            <RadialGauge
              label="Frames"
              value={framesShare}
              sublabel={`${user.total_frames.toLocaleString(
                "fr-FR"
              )} / ${global.total_frames.toLocaleString("fr-FR")}`}
              color="#ec4899"
            />
            <RadialGauge
              label="Durée"
              value={durationShare}
              sublabel={`${formatDuration(
                user.total_duration_ms
              )} / ${formatDuration(global.total_duration_ms)}`}
              color="#8b5cf6"
            />
          </div>
        </section>
      )}

      {/* Moyennes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard
          label="Durée moyenne / vidéo"
          value={formatDuration(user.avg_duration_ms)}
        />
        <StatCard
          label="Frames moyennes / vidéo"
          value={Math.round(user.avg_frames_per_video).toLocaleString("fr-FR")}
        />
      </div>

      {/* Donut + bar chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          {donutSlices.length > 0 && (
            <DonutChart
              title="Top lettres"
              data={donutSlices}
              centerLabel="Frames"
              centerValue={user.total_frames.toLocaleString("fr-FR")}
            />
          )}
        </div>
        <div className="lg:col-span-2">
          <LetterBars
            title={`Distribution complète (${letters.length} classes)`}
            data={letters}
            highlight={user.top_letter ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
