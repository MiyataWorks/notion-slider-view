"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Slider from "@/components/slider";
import ControlPanel from "@/components/control-panel";
import { FALLBACK_SLIDES } from "@/lib/notion";
import type { Slide } from "@/lib/notion";

const DEFAULT_INTERVAL = 10;

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [autoPlayInterval, setAutoPlayInterval] = useState<number>(DEFAULT_INTERVAL);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [visibleNeighbors, setVisibleNeighbors] = useState<number>(2);
  const [slides, setSlides] = useState<Slide[]>(() => FALLBACK_SLIDES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(undefined);

        const qs = searchParams.toString();
        const url = qs ? `/api/slides?${qs}` : "/api/slides";
        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch slides (${response.status})`);
        }

        const data = (await response.json()) as {
          slides: Slide[];
          error?: string;
        };

        setSlides(data.slides.length > 0 ? data.slides : FALLBACK_SLIDES);
        setError(data.error);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }

        console.error(fetchError);
        setSlides(FALLBACK_SLIDES);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "データ取得に失敗しました",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [visibleNeighbors, searchParams]);

  // Sync settings with URL query (client-side only)
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set("neighbors", String(visibleNeighbors));
    params.set("interval", String(autoPlayInterval));
    // Replace state without scroll
    router.replace(`/?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNeighbors, autoPlayInterval]);

  useEffect(() => {
    // Initialize from URL on first render
    const intervalParam = searchParams.get("interval");
    const neighborsParam = searchParams.get("neighbors");
    if (intervalParam) {
      const parsed = Number(intervalParam);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 60) {
        setAutoPlayInterval(parsed);
      }
    }
    if (neighborsParam) {
      const parsed = Number(neighborsParam);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 5) {
        setVisibleNeighbors(parsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-gradient-to-br from-slate-950 via-gray-900 to-slate-900 px-4 py-12 text-slate-50 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between text-xs text-white/50">
          {isLoading ? (
            <span>Notionからデータを読み込み中...</span>
          ) : (
            <span>{slides.length} 件のページを表示中</span>
          )}
          {error && <span className="text-rose-400">{error}</span>}
        </div>
        <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <Slider
            slides={slides}
            autoPlayInterval={autoPlayInterval}
            visibleNeighbors={visibleNeighbors}
            onToggleSettings={() => setShowControls((prev) => !prev)}
            isSettingsVisible={showControls}
          />
        </div>
        {showControls ? (
          <div className="mt-6">
            <ControlPanel
              autoPlayInterval={autoPlayInterval}
              visibleNeighbors={visibleNeighbors}
              onAutoPlayIntervalChange={setAutoPlayInterval}
              onVisibleNeighborsChange={setVisibleNeighbors}
              // Future: hook to bind Notion query params as well
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
