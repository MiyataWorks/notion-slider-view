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
  databaseId: process.env.NOTION_DATABASE_ID,
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

  const databaseId = query.databaseId ?? process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    return {
      slides: [],
      error: "データベースIDが指定されていません",
    };
  }

  try {
    const response = await (notionClient as unknown as {
      databases: {
        query: (params: {
          database_id: string;
          page_size: number;
          sorts?: Array<{
            property: string;
            direction: "ascending" | "descending";
          }>;
        }) => Promise<{ results: Array<{ object: string } & Record<string, unknown>> }>;
      };
    }).databases.query({
      database_id: databaseId,
      page_size: Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE),
      sorts:
        query.sortProperty && query.sortDirection
          ? [
              {
                property: query.sortProperty,
                direction: query.sortDirection,
              },
            ]
          : undefined,
    });

    const slides = response.results
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

