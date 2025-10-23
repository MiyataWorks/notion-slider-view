"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { clsx } from "clsx";
import type { Slide } from "@/lib/notion";

type SliderProps = {
  slides: Slide[];
  autoPlayInterval?: number;
  visibleNeighbors?: number;
  onToggleSettings?: () => void;
  isSettingsVisible?: boolean;
};

const clampVisibleNeighbors = (value: number) => Math.max(0, Math.min(value, 5));

const createIndices = (current: number, total: number, range: number) => {
  const indices = [] as number[];

  for (let offset = -range; offset <= range; offset += 1) {
    let index = current + offset;
    if (index < 0) {
      index = total + index;
    } else if (index >= total) {
      index -= total;
    }
    indices.push(index);
  }

  return indices;
};

const dotClass = (active: boolean) =>
  clsx(
    "h-2 w-2 rounded-full transition",
    active ? "bg-white" : "bg-white/20 hover:bg-white/40",
  );

const useAutoPlay = (
  enabled: boolean,
  intervalSeconds: number,
  onTick: () => void,
) => {
  const savedCallback = useRef(onTick);

  useEffect(() => {
    savedCallback.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!enabled) return undefined;

    const interval = window.setInterval(() => {
      savedCallback.current();
    }, intervalSeconds * 1000);

    return () => window.clearInterval(interval);
  }, [enabled, intervalSeconds]);
};

export default function Slider({
  slides,
  autoPlayInterval = 10,
  visibleNeighbors = 2,
  onToggleSettings,
  isSettingsVisible,
}: SliderProps) {
  const range = clampVisibleNeighbors(visibleNeighbors);
  const [current, setCurrent] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const total = slides.length;
  const safeCurrent = total > 0 ? ((current % total) + total) % total : 0;

  const goTo = (index: number) => {
    if (total === 0) return;
    const normalized = ((index % total) + total) % total;
    setCurrent(normalized);
  };

  const goNext = () => goTo(safeCurrent + 1);
  const goPrev = () => goTo(safeCurrent - 1);

  useAutoPlay(isPlaying && !isHovered && total > 1, autoPlayInterval, goNext);

  const visibleIndices = useMemo(() => {
    if (total === 0) return [] as number[];
    return createIndices(safeCurrent, total, range);
  }, [safeCurrent, total, range]);

  const controlButtonClass = "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/20";

  return (
    <div className="relative flex flex-col gap-8">
      <div
        className="relative flex min-h-[320px] items-center justify-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {visibleIndices.map((index) => {
          const slide = slides[index];
          const offset = index - safeCurrent;
          const isActive = index === safeCurrent;
          const depth = Math.abs(offset);
          const scale = isActive ? 1 : 1 - depth * 0.08;
          const translate = offset * 120;
          const blur = depth * 1.5;
          const opacity = Math.max(0, 1 - depth * 0.25);

          return (
            <a
              key={slide.id}
              href={slide.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                "absolute flex w-full max-w-2xl flex-col rounded-3xl bg-black/60 text-white shadow-2xl transition will-change-transform",
                "overflow-hidden border border-white/10 backdrop-blur",
                "hover:border-white/30",
              )}
              style={{
                transform: `translateX(${translate}px) scale(${scale})`,
                zIndex: range - depth,
                filter: `blur(${blur}px)`,
                opacity,
              }}
            >
              <div className="relative h-72 w-full overflow-hidden">
                {slide.coverUrl ? (
                  <Image
                    src={slide.coverUrl}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 90vw, 700px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-sm text-white/60">
                    No Cover Image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <h2 className="text-xl font-semibold tracking-wide">
                  {slide.title}
                </h2>
                {slide.description && (
                  <p className="text-sm leading-relaxed text-white/70">
                    {slide.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between text-xs text-white/60">
                  <span>詳細を見る</span>
                  <span>Notion ↗</span>
                </div>
              </div>
            </a>
          );
        })}

        <div className="pointer-events-none absolute inset-0 rounded-[30px] border border-white/10" />

        <button
          className="group absolute left-0 top-1/2 -translate-y-1/2 translate-x-[-50%] rounded-full border border-white/10 bg-black/60 p-3 text-white shadow-lg transition hover:bg-white/20"
          onClick={goPrev}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          className="group absolute right-0 top-1/2 -translate-y-1/2 translate-x-[50%] rounded-full border border-white/10 bg-black/60 p-3 text-white shadow-lg transition hover:bg-white/20"
          onClick={goNext}
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            className={controlButtonClass}
            onClick={() => setIsPlaying((prev) => !prev)}
            aria-label={isPlaying ? "一時停止" : "再生"}
            title={isPlaying ? "一時停止" : "再生"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          {onToggleSettings ? (
            <button
              className={clsx(
                controlButtonClass,
                isSettingsVisible ? "bg-white/20" : "bg-white/10",
              )}
              onClick={onToggleSettings}
              aria-label={isSettingsVisible ? "設定を閉じる" : "設定を開く"}
              title={isSettingsVisible ? "設定を閉じる" : "設定を開く"}
            >
              <span aria-hidden className="text-base">⚙️</span>
              <span className="sr-only">設定</span>
            </button>
          ) : null}
          <span className="ml-2 text-xs text-white/50">{autoPlayInterval}秒</span>
        </div>

        <div className="flex items-center gap-1">
          {slides.map((_, index) => (
            <button
              key={index}
              className={dotClass(index === current)}
              onClick={() => goTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

