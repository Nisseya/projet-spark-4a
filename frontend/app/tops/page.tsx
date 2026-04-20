import { api, fetchJsonl } from "@/lib/api";

export const dynamic = "force-dynamic";

async function safeLoad(kind: string): Promise<any[]> {
  try {
    const { url } = await api<{ url: string }>(`/api/stats/tops/${kind}`);
    return await fetchJsonl(url);
  } catch {
    return [];
  }
}

function formatDuration(ms: number) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)} min`;
  return `${(m / 60).toFixed(1)} h`;
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export default async function TopsPage() {
  const [usersByCount, usersByDur, longest, letters] = await Promise.all([
    safeLoad("users-by-video-count"),
    safeLoad("users-by-duration"),
    safeLoad("longest-videos"),
    safeLoad("letters"),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Classements</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tops agrégés sur l'ensemble du pipeline.
        </p>
      </div>

      <TopTable
        title="Top utilisateurs — nombre de vidéos"
        rows={usersByCount}
        render={(r, i) => (
          <>
            <Rank n={i + 1} />
            <td className="px-4 py-3 font-mono text-xs text-zinc-400">
              {shortId(r.user_id)}
            </td>
            <td className="px-4 py-3 text-right font-mono text-zinc-100">
              {r.nb_videos}
            </td>
          </>
        )}
        headers={["#", "User", "Vidéos"]}
      />

      <TopTable
        title="Top utilisateurs — durée cumulée"
        rows={usersByDur}
        render={(r, i) => (
          <>
            <Rank n={i + 1} />
            <td className="px-4 py-3 font-mono text-xs text-zinc-400">
              {shortId(r.user_id)}
            </td>
            <td className="px-4 py-3 text-right font-mono text-zinc-100">
              {formatDuration(r.total_duration_ms)}
            </td>
          </>
        )}
        headers={["#", "User", "Durée"]}
      />

      <TopTable
        title="Vidéos les plus longues"
        rows={longest}
        render={(r, i) => (
          <>
            <Rank n={i + 1} />
            <td className="px-4 py-3 font-mono text-xs text-zinc-400">
              {shortId(r.video_id)}
            </td>
            <td className="px-4 py-3 text-zinc-100">
              {r.predicted_word || (
                <span className="text-zinc-600">–</span>
              )}
            </td>
            <td className="px-4 py-3 text-right font-mono text-zinc-400">
              {r.nb_frames}
            </td>
            <td className="px-4 py-3 text-right font-mono text-zinc-100">
              {formatDuration(r.duration_ms)}
            </td>
          </>
        )}
        headers={["#", "Vidéo", "Mot prédit", "Frames", "Durée"]}
      />

      <TopTable
        title="Lettres les plus prédites"
        rows={letters}
        render={(r, i) => (
          <>
            <Rank n={i + 1} />
            <td className="px-4 py-3 font-mono text-lg text-indigo-400">
              {r.translation}
            </td>
            <td className="px-4 py-3 text-right font-mono text-zinc-100">
              {r.cnt.toLocaleString("fr-FR")}
            </td>
          </>
        )}
        headers={["#", "Lettre", "Occurrences"]}
      />
    </div>
  );
}

function Rank({ n }: { n: number }) {
  return (
    <td className="w-12 px-4 py-3 font-mono text-xs text-zinc-500">#{n}</td>
  );
}

function TopTable({
  title,
  rows,
  headers,
  render,
}: {
  title: string;
  rows: any[];
  headers: string[];
  render: (row: any, i: number) => React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
        {title}
      </h2>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-medium ${
                    i >= 2 ? "text-right" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  Aucune donnée — lance StatsMain.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-zinc-800 transition-colors hover:bg-zinc-900/40"
                >
                  {render(r, i)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
