"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { apiUrl } from "@/lib/api";
import StatusPill from "@/components/status-pill";
import { Upload } from "lucide-react";

type Video = {
  id: string;
  name: string;
  extension: string;
  status: string;
  created_at: string;
  updated_at: string;
  error: string | null;
};

export default function VideosPage() {
  const { data: session, isPending } = useSession();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const userId = session?.user?.id;

  async function refresh() {
    if (!userId) return;
    setLoading(true);
    try {
      const r = await fetch(apiUrl(`/api/videos?user_id=${userId}`));
      setVideos(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [userId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    setProgress(0);

    try {
      const ext = file.name.split(".").pop() ?? "mp4";
      const init = await fetch(apiUrl("/api/videos"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: file.name,
          extension: ext,
          content_type: file.type || "video/mp4",
        }),
      }).then((r) => r.json());

      await uploadWithProgress(init.upload_url, file, setProgress);

      await fetch(apiUrl(`/api/videos/${init.video_id}/complete`), {
        method: "POST",
      });

      await refresh();
    } catch (err) {
      alert(`Upload failed: ${err}`);
    } finally {
      setUploading(false);
      setProgress(0);
      e.target.value = "";
    }
  }

  if (isPending) {
    return <p className="text-sm text-zinc-500">Chargement…</p>;
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center">
        <p className="text-sm text-zinc-300">
          Tu dois être connecté pour voir tes vidéos.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes vidéos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload, statut et accès aux annotations de tes vidéos.
          </p>
        </div>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 ${
            uploading ? "opacity-60" : ""
          }`}
        >
          <Upload className="h-4 w-4" />
          {uploading ? `Upload… ${progress}%` : "Uploader une vidéo"}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Créée le</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && !videos.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Chargement…
                </td>
              </tr>
            ) : videos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                  Aucune vidéo. Upload ta première vidéo pour commencer.
                </td>
              </tr>
            ) : (
              videos.map((v) => (
                <tr
                  key={v.id}
                  className="border-t border-zinc-800 transition-colors hover:bg-zinc-900/40"
                >
                  <td className="px-4 py-3">
                    <div className="text-zinc-100">{v.name}</div>
                    {v.error && (
                      <div className="mt-1 font-mono text-xs text-red-400">
                        {v.error}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={v.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(v.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {v.status === "DONE" ? (
                      <Link
                        href={`/videos/${v.id}`}
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        Voir →
                      </Link>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`${xhr.status} ${xhr.statusText}`));
    xhr.onerror = () => reject(new Error("network error"));
    xhr.send(file);
  });
}
