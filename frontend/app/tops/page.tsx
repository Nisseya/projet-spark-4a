import { api, fetchJsonl } from "@/lib/api";
import HBarRanking from "@/components/h-bar-ranking";

export const dynamic = "force-dynamic";

async function safe(kind: string): Promise<any[]> {
  try {
    const { url } = await api<{ url: string }>(`/api/stats/tops/${kind}`);
    return await fetchJsonl(url);
  } catch {
    return [];
  }
}

function nameFor(u: any): string {
  return (
    u.user_name ||
    (u.user_email ? u.user_email.split("@")[0] : null) ||
    String(u.user_id ?? "").slice(0, 8)
  );
}

function videoLabel(v: any): string {
  const name = v.predicted_word || "–";
  const id = String(v.video_id ?? "").slice(0, 8);
  return `${name} · ${id}`;
}

type FormatKind = "number" | "duration_ms" | "duration_s" | "seconds";

export default async function TopsPage() {
  const [usersByCount, usersByDur, longest, letters] = await Promise.all([
    safe("users-by-video-count"),
    safe("users-by-duration"),
    safe("longest-videos"),
    safe("letters"),
  ]);

  const sections: {
    title: string;
    data: { label: string; value: number }[];
    format?: FormatKind;
    height?: number;
  }[] = [
    {
      title: "Top utilisateurs — nombre de vidéos",
      data: usersByCount.slice(0, 10).map((u: any) => ({
        label: nameFor(u),
        value: Number(u.nb_videos ?? 0),
      })),
    },
    {
      title: "Top utilisateurs — durée cumulée",
      data: usersByDur.slice(0, 10).map((u: any) => ({
        label: nameFor(u),
        value: Number(u.total_duration_ms ?? 0),
      })),
      format: "duration_ms",
    },
    {
      title: "Vidéos les plus longues",
      data: longest.slice(0, 10).map((v: any) => ({
        label: videoLabel(v),
        value: Number(v.duration_ms ?? 0),
      })),
      format: "duration_ms",
    },
    {
      title: "Lettres les plus prédites",
      data: letters.slice(0, 15).map((l: any) => ({
        label: l.translation,
        value: Number(l.cnt ?? 0),
      })),
      height: 520,
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Classements</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Visualisations des tops agrégés sur l'ensemble du pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {sections.map((sec) => (
          <div key={sec.title}>
            {sec.data.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center text-sm text-zinc-500">
                Aucune donnée — lance StatsMain.
              </div>
            ) : (
              <HBarRanking
                title={sec.title}
                data={sec.data}
                format={sec.format}
                height={sec.height ?? 400}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}