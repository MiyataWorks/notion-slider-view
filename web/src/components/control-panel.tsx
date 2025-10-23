"use client";

type ControlPanelProps = {
  autoPlayInterval: number;
  visibleNeighbors: number;
  onAutoPlayIntervalChange: (value: number) => void;
  onVisibleNeighborsChange: (value: number) => void;
  // Notion database configuration
  databaseId?: string;
  onDatabaseIdChange?: (value: string) => void;
  imageProperty?: string;
  onImagePropertyChange?: (value: string | undefined) => void;
  imagePropertyOptions?: string[];
  displayPropertyOptions?: string[];
  selectedDisplayProperties?: string[];
  onSelectedDisplayPropertiesChange?: (values: string[]) => void;
  // Visuals
  imageAspect?: "landscape" | "portrait" | "square";
  onImageAspectChange?: (value: "landscape" | "portrait" | "square") => void;
};

const intervalOptions = [5, 10, 15, 20, 30];

const neighborOptions = [0, 1, 2, 3, 4, 5];

const labelClass = "text-xs font-medium uppercase tracking-[0.3em] text-white/50";

export default function ControlPanel({
  autoPlayInterval,
  visibleNeighbors,
  onAutoPlayIntervalChange,
  onVisibleNeighborsChange,
  databaseId,
  onDatabaseIdChange,
  imageProperty,
  onImagePropertyChange,
  imagePropertyOptions,
  displayPropertyOptions,
  selectedDisplayProperties,
  onSelectedDisplayPropertiesChange,
  imageAspect = "landscape",
  onImageAspectChange,
}: ControlPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur">
      <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
        Display Settings
      </h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* Visual: Image aspect ratio */}
        <div className="rounded-xl bg-white/5 p-4">
          <p className={labelClass}>Image Size</p>
          <div className="mt-3 flex items-center gap-3">
            <select
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white"
              value={imageAspect}
              onChange={(e) => onImageAspectChange?.(e.target.value as any)}
            >
              <option value="landscape">横長 (16:9)</option>
              <option value="square">正方形 (1:1)</option>
              <option value="portrait">縦長 (3:4)</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-white/50">画像の縦横比を選択します。</p>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <p className={labelClass}>Auto Play Interval</p>
          <div className="mt-3 flex items-center gap-3">
            <select
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white"
              value={autoPlayInterval}
              onChange={(event) => {
                const value = Number(event.target.value);
                onAutoPlayIntervalChange(value);
              }}
            >
              {intervalOptions.map((option) => (
                <option key={option} value={option}>
                  {option} 秒
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-white/50">
            スライドが自動で切り替わる間隔を調整します。
          </p>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <p className={labelClass}>Neighbor Cards</p>
          <div className="mt-3 flex items-center gap-3">
            <select
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white"
              value={visibleNeighbors}
              onChange={(event) => {
                const value = Number(event.target.value);
                onVisibleNeighborsChange(value);
              }}
            >
              {neighborOptions.map((option) => (
                <option key={option} value={option}>
                  {option} 枚
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-white/50">
            中央カードの前後に表示するカードの枚数を設定します。
          </p>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <p className={labelClass}>Notion Database</p>
          <div className="mt-3 flex items-center gap-3">
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder-white/30"
              placeholder="データベースID またはURL"
              value={databaseId ?? ""}
              onChange={(e) => onDatabaseIdChange?.(e.target.value)}
            />
          </div>
          <p className="mt-2 text-xs text-white/50">
            未指定時は環境変数 `NOTION_DATABASE_ID` を使用します。
          </p>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <p className={labelClass}>Image Property</p>
          {imagePropertyOptions && imagePropertyOptions.length > 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <select
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white"
                value={imageProperty ?? ""}
                onChange={(e) => onImagePropertyChange?.(e.target.value || undefined)}
              >
                <option value="">自動（カバー画像）</option>
                {imagePropertyOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder-white/30"
                placeholder="画像/カバー など (任意)"
                value={imageProperty ?? ""}
                onChange={(event) => onImagePropertyChange?.(event.target.value)}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-white/50">
            画像を格納しているファイル型プロパティ名を指定します。未指定時はページのカバー画像を使用します。
          </p>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <p className={labelClass}>Display Properties</p>
          {displayPropertyOptions && displayPropertyOptions.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {displayPropertyOptions.map((name) => {
                const checked = (selectedDisplayProperties ?? []).includes(name);
                return (
                  <label key={name} className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-black/40"
                      checked={checked}
                      onChange={(e) => {
                        const current = new Set(selectedDisplayProperties ?? []);
                        if (e.target.checked) current.add(name);
                        else current.delete(name);
                        onSelectedDisplayPropertiesChange?.(Array.from(current));
                      }}
                    />
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/70">対応するプロパティが見つかれば一覧が表示されます。</p>
          )}
          <p className="mt-2 text-xs text-white/50">選択したプロパティはカード本文に追加表示されます。</p>
        </div>
      </div>
    </div>
  );
}

