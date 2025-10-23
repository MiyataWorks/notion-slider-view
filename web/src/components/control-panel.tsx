"use client";

type ControlPanelProps = {
  autoPlayInterval: number;
  visibleNeighbors: number;
  onAutoPlayIntervalChange: (value: number) => void;
  onVisibleNeighborsChange: (value: number) => void;
  imageProperty?: string;
  onImagePropertyChange?: (value: string) => void;
};

const intervalOptions = [5, 10, 15, 20, 30];

const neighborOptions = [0, 1, 2, 3, 4, 5];

const labelClass = "text-xs font-medium uppercase tracking-[0.3em] text-white/50";

export default function ControlPanel({
  autoPlayInterval,
  visibleNeighbors,
  onAutoPlayIntervalChange,
  onVisibleNeighborsChange,
  imageProperty,
  onImagePropertyChange,
}: ControlPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur">
      <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
        Display Settings
      </h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
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
          <p className="mt-2 text-sm text-white/70">
            .env に `NOTION_TOKEN` と `NOTION_DATABASE_ID` を設定すると、Notion の実データが表示されます。
          </p>
          <ul className="mt-3 space-y-1 text-xs text-white/50">
            <li>1. Notion で内部インテグレーションを作成し、シークレットを取得</li>
            <li>2. データベースをインテグレーションに共有</li>
            <li>3. `.env.local` に値を設定し、サーバーを再起動</li>
          </ul>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <p className={labelClass}>Image Property</p>
          <div className="mt-3 flex items-center gap-3">
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder-white/30"
              placeholder="画像/カバー など (任意)"
              value={imageProperty ?? ""}
              onChange={(event) => onImagePropertyChange?.(event.target.value)}
            />
          </div>
          <p className="mt-2 text-xs text-white/50">
            画像を格納しているファイル型プロパティ名を指定します。未指定時はページのカバー画像を使用します。
          </p>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <p className={labelClass}>Display Properties</p>
          <p className="mt-2 text-sm text-white/70">
            今後追加予定：Notion DB のプロパティを選択してタイトル・説明・画像などを指定できるようになります。
          </p>
          <p className="mt-2 text-xs text-white/50">
            現時点では各ページのカバー画像を使用し、タイトルは `title` プロパティを参照します。
          </p>
        </div>
      </div>
    </div>
  );
}

