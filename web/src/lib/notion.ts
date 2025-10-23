import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export type Slide = {
  id: string;
  title: string;
  description?: string;
  coverUrl: string | null;
  notionUrl: string;
};

export type SlideQuery = {
  databaseId?: string;
  titleProperty?: string;
  descriptionProperty?: string;
  imageProperty?: string;
  pageSize?: number;
  sortProperty?: string;
  sortDirection?: "ascending" | "descending";
};

export const defaultSlideQuery: SlideQuery = {
  // Normalize env value to hyphenated UUID if provided
  databaseId: (() => {
    const raw = process.env.NOTION_DATABASE_ID;
    if (!raw) return undefined;
    const normalized = normalizeDatabaseId(raw);
    return normalized ?? undefined;
  })(),
  titleProperty: "タイトル",
  descriptionProperty: undefined,
  imageProperty: undefined,
  pageSize: undefined,
  sortProperty: undefined,
  sortDirection: undefined,
};

const notionToken = process.env.NOTION_TOKEN;

let notionClient: Client | null = null;

if (notionToken) {
  notionClient = new Client({ auth: notionToken });
}

const DEFAULT_PAGE_SIZE = 100;

const createNotionUrl = (pageId: string) =>
  `https://www.notion.so/${pageId.replace(/-/g, "")}`;

// Convert various inputs (URL, hyphen-less ID, slugged URL) to hyphenated UUID
const normalizeDatabaseId = (input?: string): string | undefined => {
  if (!input) return undefined;
  const trimmed = input.trim();

  // If it's already a hyphenated UUID, accept it
  const hyphenatedMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (hyphenatedMatch) return hyphenatedMatch[0].toLowerCase();

  // Try to find a 32-char hex id (from Notion URLs without hyphens)
  const compact = trimmed.replace(/-/g, "");
  const compactMatch = compact.match(/[0-9a-fA-F]{32}/);
  if (!compactMatch) return undefined;

  const id32 = compactMatch[0].toLowerCase();
  // Insert hyphens: 8-4-4-4-12
  return `${id32.slice(0, 8)}-${id32.slice(8, 12)}-${id32.slice(12, 16)}-${id32.slice(16, 20)}-${id32.slice(20)}`;
};

const getPlainText = (page: PageObjectResponse, propertyName?: string) => {
  if (!propertyName) return undefined;
  const property = page.properties[propertyName];
  if (!property) return undefined;

  switch (property.type) {
    case "title":
      return property.title.map((t) => t.plain_text).join("");
    case "rich_text":
      return property.rich_text.map((t) => t.plain_text).join("");
    case "select":
      return property.select?.name;
    case "multi_select":
      return property.multi_select.map((item) => item.name).join(", ");
    case "url":
      return property.url ?? undefined;
    case "number":
      return property.number != null ? String(property.number) : undefined;
    case "date":
      return property.date?.start ?? undefined;
    default:
      return undefined;
  }
};

const getImageUrl = (
  page: PageObjectResponse,
  imageProperty?: string,
): string | null => {
  if (page.cover) {
    if (page.cover.type === "file") {
      return page.cover.file.url;
    }
    if (page.cover.type === "external") {
      return page.cover.external.url;
    }
  }

  if (imageProperty) {
    const property = page.properties[imageProperty];
    if (property?.type === "files" && property.files.length > 0) {
      const file = property.files[0];
      if (file.type === "file") {
        return file.file.url;
      }
      if (file.type === "external") {
        return file.external.url;
      }
    }
  }

  return null;
};

export const fetchSlides = async (
  query: SlideQuery,
): Promise<{ slides: Slide[]; error?: string }> => {
  if (!notionClient) {
    return {
      slides: [],
      error: "NOTION_TOKEN が設定されていません",
    };
  }

  const databaseId = normalizeDatabaseId(
    query.databaseId ?? process.env.NOTION_DATABASE_ID,
  );

  if (!databaseId) {
    return {
      slides: [],
      error: "データベースIDが指定されていません",
    };
  }

  try {
    const pageSize = Math.min(
      query.pageSize ?? DEFAULT_PAGE_SIZE,
      DEFAULT_PAGE_SIZE,
    );

    const sortsParam =
      query.sortProperty && query.sortDirection
        ? [
            {
              property: query.sortProperty,
              direction: query.sortDirection,
            },
          ]
        : undefined;

    const anyClient = notionClient as unknown as Record<string, unknown> & {
      databases?: { query?: Function };
      request?: (args: {
        path: string;
        method: "GET" | "POST" | "PATCH" | "DELETE";
        body?: unknown;
      }) => Promise<unknown>;
    };

    let response: any;

    // 1) Prefer SDK wrapper if available (@notionhq/client v2)
    if (
      anyClient.databases &&
      typeof anyClient.databases.query === "function"
    ) {
      response = await anyClient.databases.query({
        database_id: databaseId,
        page_size: pageSize,
        sorts: sortsParam,
      });
    }
    // 2) Use low-level request if on newer SDK versions
    else if (typeof anyClient.request === "function") {
      // The generic request API expects the path 'databases/query' with database_id in body
      response = await anyClient.request({
        path: "databases/query",
        method: "POST",
        body: {
          database_id: databaseId,
          page_size: pageSize,
          sorts: sortsParam,
        },
      });
    }
    // 3) Final fallback: direct HTTPS call
    else {
      const res = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${notionToken}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify({
            page_size: pageSize,
            sorts: sortsParam,
          }),
        },
      );

      if (!res.ok) {
        throw new Error(`Notion API error (${res.status})`);
      }
      response = await res.json();
    }

    const slides = (response.results as Array<Record<string, unknown>>)
      .filter((page): page is PageObjectResponse => page.object === "page")
      .map((page) => {
        const title =
          getPlainText(page, query.titleProperty) ?? "Untitled";
        const description = getPlainText(page, query.descriptionProperty);
        const coverUrl = getImageUrl(page, query.imageProperty);

        return {
          id: page.id,
          title,
          description,
          coverUrl,
          notionUrl: createNotionUrl(page.id),
        } satisfies Slide;
      });

    return { slides };
  } catch (error) {
    console.error("Failed to fetch Notion data", error);
    return {
      slides: [],
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };
  }
};

export const FALLBACK_SLIDES: Slide[] = [
  {
    id: "demo-1",
    title: "デモスライド 1",
    description: "Notion API の設定が完了すると実データが表示されます。",
    coverUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    notionUrl: "https://www.notion.so",
  },
  {
    id: "demo-2",
    title: "デモスライド 2",
    description: "カバー画像がページの背景として利用されます。",
    coverUrl:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=80",
    notionUrl: "https://www.notion.so",
  },
  {
    id: "demo-3",
    title: "デモスライド 3",
    description: "設定パネルから表示プロパティやスライド間隔を調整できます。",
    coverUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    notionUrl: "https://www.notion.so",
  },
];

