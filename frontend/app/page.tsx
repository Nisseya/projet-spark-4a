import StatCard from "@/components/stat-card";
import LetterBars from "@/components/letter-bars";
import { api, fetchJsonl } from "@/lib/api";

export const dynamic = "force-dynamic";

type Global = {
  total_users: number;
  total_videos: number;
  total_frames: number;
  total_duration_ms: number;
  avg_duration_ms_per_video: number;
  avg_frames_per_video: number;
  letter_distribution: Record<string, number>;
};

async function loadGlobal(): Promise<Global | null> {
  try {
    const { url } = await api<{ url: string }>("/api/stats/global");
    const rows = await fetchJsonl<Global>(url);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function formatDuration(ms: number) {
  if (!ms) return "0 s";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)} min`;
  const h = m / 60;
  return `${h.toFixed(1)} h`;
}

export default async function Dashboard() {
  const g = await loadGlobal();

  if (!g) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard global</h1>
        <EmptyState
          title="Aucune statistique disponible"
          description="Lance StatsMain depuis la page Admin pour générer les données."
        />
      </div>
    );
  }

  const letters = Object.entries(g.letter_distribution ?? {})
    .filter(([k]) => k !== "undefined")
    .map(([letter, count]) => ({ letter, count: Number(count) }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard global</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Vue d'ensemble du pipeline ASL.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Utilisateurs" value={g.total_users} />
        <StatCard label="Vidéos" value={g.total_videos} />
        <StatCard
          label="Frames traitées"
          value={g.total_frames.toLocaleString("fr-FR")}
        />
        <StatCard
          label="Durée cumulée"
          value={formatDuration(g.total_duration_ms)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard
          label="Durée moyenne / vidéo"
          value={formatDuration(g.avg_duration_ms_per_video)}
        />
        <StatCard
          label="Frames moyennes / vidéo"
          value={Math.round(g.avg_frames_per_video).toLocaleString("fr-FR")}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Distribution des lettres prédites
          </h2>
          <span className="text-xs text-zinc-600">
            {letters.length} classes · hors "undefined"
          </span>
        </div>
        <LetterBars data={letters} />
      </section>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center">
      <div className="text-sm font-medium text-zinc-200">{title}</div>
      <div className="mt-1 text-xs text-zinc-500">{description}</div>
    </div>
  );
}
