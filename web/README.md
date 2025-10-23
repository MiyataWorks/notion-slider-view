## Notion Slider View

Notion データベースのカバー画像を滑らかなスライドとして埋め込み表示するためのウィジェットです。Notion の `embed` ブロックにデプロイ済み URL を貼るだけで利用できます。

### 必要環境

- Node.js 18 以上
- npm
- Notion API トークン（内部インテグレーション）
- 対象の Notion データベース ID

### セットアップ

1. 依存パッケージをインストール

   ```bash
   npm install
   ```

2. `.env.local` を作成し、Notion API 認証情報を記載（`.env.example` を参照）

   ```bash
   NOTION_TOKEN=YOUR_NOTION_INTEGRATION_TOKEN
   NOTION_DATABASE_ID=YOUR_DATABASE_ID
   ```

3. 開発サーバーを起動

   ```bash
   npm run dev
   ```

   ブラウザで `http://localhost:3000` を開き、スライダービューを確認します。

### ビルド & テスト

```bash
npm run lint
npm run build
```

### デプロイ

推奨: [Vercel](https://vercel.com/)

1. GitHub リポジトリを Vercel に接続
2. プロジェクトの環境変数として `NOTION_TOKEN` と `NOTION_DATABASE_ID` を設定
3. デプロイが完了すると公開 URL が発行されます。Notion の `embed` ブロックに貼り付けて利用してください。

### 設定項目

- 自動スライド間隔（5〜30 秒から選択）
- 前後に表示するカード枚数（0〜5 枚）
- Notion API 設定ガイド（手順メモ）

今後は Notion DB のプロパティ選択やソート／フィルター指定、キャッシュ最適化などを追加予定です。
