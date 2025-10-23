import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// Debug utilities (server-side only)
const isNotionDebugEnabled = (): boolean => {
  const flag = process.env["DEBUG_NOTION"]?.toLowerCase();
  const enabledByFlag = flag === "1" || flag === "true" || flag === "on";
  const enabledByEnv = process.env["NODE_ENV"] !== "production";
  return enabledByFlag || enabledByEnv;
};

const maskSecret = (
  value: string | undefined,
  visibleStart: number = 6,
  visibleEnd: number = 4,
): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= visibleStart + visibleEnd) return "*".repeat(trimmed.length);
  return `${trimmed.slice(0, visibleStart)}...${trimmed.slice(-visibleEnd)}`;
};

export type Slide = {
  id: string;
  title: string;
  description?: string;
  coverUrl: string | null;
  notionUrl: string;
  // Optional additional key-value properties selected by the user to display
  properties?: Record<string, string>;
};

export type SlideQuery = {
  databaseId?: string;
  titleProperty?: string;
  descriptionProperty?: string;
  imageProperty?: string;
  pageSize?: number;
  sortProperty?: string;
  sortDirection?: "ascending" | "descending";
  filterProperty?: string;
  filterOperator?: "contains" | "equals";
  filterValue?: string;
  displayProperties?: string[];
};

export type DatabasePropertyMeta = {
  name: string;
  type: string;
};

export type DatabasePropertiesSummary = {
  all: DatabasePropertyMeta[];
  files: string[]; // candidates for image property
  displayable: string[]; // candidates for displaying as text
  titleName?: string;
};

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

export const defaultSlideQuery: SlideQuery = {
  // Normalize env value to hyphenated UUID if provided
  databaseId: (() => {
    const raw = process.env["NOTION_DATABASE_ID"];
    if (!raw || raw.trim() === "") return undefined;
    const normalized = normalizeDatabaseId(raw);
    if (isNotionDebugEnabled()) {
      const preview = maskSecret(normalized);
      console.log("[notion:debug] NOTION_DATABASE_ID detected (normalized)", {
        provided: true,
        rawLength: raw.length,
        normalizedPreview: preview,
      });
    }
    return normalized ?? undefined;
  })(),
  titleProperty: "タイトル",
  descriptionProperty: undefined,
  imageProperty: undefined,
  pageSize: undefined,
  sortProperty: undefined,
  sortDirection: undefined,
};

const notionTokenEnv = process.env["NOTION_TOKEN"];
const notionToken =
  notionTokenEnv && notionTokenEnv.trim() !== "" ? notionTokenEnv : undefined;

let notionClient: Client | null = null;

if (notionToken) {
  notionClient = new Client({ auth: notionToken });
}

if (isNotionDebugEnabled()) {
  console.log("[notion:debug] NOTION_TOKEN presence", {
    provided: Boolean(notionTokenEnv && notionTokenEnv.trim() !== ""),
    length: notionTokenEnv?.trim().length ?? 0,
    preview: maskSecret(notionTokenEnv),
  });
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

type PageProperty = PageObjectResponse["properties"][string];
const findTitlePropertyName = (page: PageObjectResponse): string | undefined => {
  for (const [name, prop] of Object.entries(page.properties) as Array<[
    string,
    PageProperty,
  ]>) {
    if (prop && prop.type === "title") {
      return name;
    }
  }
  return undefined;
};

const getTitleText = (
  page: PageObjectResponse,
  explicitPropertyName?: string,
): string => {
  const fromExplicit = getPlainText(page, explicitPropertyName);
  if (fromExplicit && fromExplicit.trim() !== "") return fromExplicit;
  const detectedTitleName = findTitlePropertyName(page);
  const fromDetected = getPlainText(page, detectedTitleName);
  return fromDetected && fromDetected.trim() !== "" ? fromDetected : "Untitled";
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
  options?: { includePropertiesMeta?: boolean },
): Promise<{ slides: Slide[]; error?: string; propertiesMeta?: DatabasePropertiesSummary }> => {
  if (!notionClient) {
    if (isNotionDebugEnabled()) {
      console.log("[notion:debug] Notion client is not initialized. Check NOTION_TOKEN.");
    }
    return {
      slides: [],
      error: "NOTION_TOKEN が設定されていません",
    };
  }

  const databaseId = normalizeDatabaseId(
    query.databaseId ?? process.env["NOTION_DATABASE_ID"],
  );

  if (isNotionDebugEnabled()) {
    console.log("[notion:debug] fetchSlides input", {
      query: {
        titleProperty: query.titleProperty,
        descriptionProperty: query.descriptionProperty,
        imageProperty: query.imageProperty,
        pageSize: query.pageSize,
        sortProperty: query.sortProperty,
        sortDirection: query.sortDirection,
      },
      databaseIdPreview: maskSecret(databaseId),
    });
  }

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

    // Optional filter support (limited operators)
    let filterParam: Record<string, unknown> | undefined;
    if (query.filterProperty && query.filterValue) {
      // Try to infer property type by retrieving database schema
      try {
        const db = await (notionClient as Client).databases.retrieve({
          database_id: databaseId,
        });

        type PropertySchema = { type: string };
        const getPropertySchema = (
          value: unknown,
          propertyName: string,
        ): PropertySchema | undefined => {
          if (!value || typeof value !== "object") return undefined;
          const properties = (value as Record<string, unknown>)["properties"];
          if (!properties || typeof properties !== "object") return undefined;
          const prop = (properties as Record<string, unknown>)[propertyName];
          if (!prop || typeof prop !== "object") return undefined;
          const t = (prop as Record<string, unknown>)["type"];
          return typeof t === "string" ? { type: t } : undefined;
        };

        const schema = getPropertySchema(db, query.filterProperty);
        const operator = query.filterOperator ?? "contains";
        if (schema) {
          switch (schema.type) {
            case "select":
              filterParam = {
                property: query.filterProperty,
                select: { equals: query.filterValue },
              };
              break;
            case "multi_select":
              filterParam = {
                property: query.filterProperty,
                multi_select: { contains: query.filterValue },
              };
              break;
            case "title":
            case "rich_text":
              filterParam = {
                property: query.filterProperty,
                [schema.type]: { [operator]: query.filterValue },
              };
              break;
            case "status":
              filterParam = {
                property: query.filterProperty,
                status: { equals: query.filterValue },
              };
              break;
            case "checkbox":
              filterParam = {
                property: query.filterProperty,
                checkbox: { equals: query.filterValue === "true" },
              };
              break;
            case "number":
              {
                const num = Number(query.filterValue);
                if (Number.isFinite(num)) {
                  filterParam = {
                    property: query.filterProperty,
                    number: { equals: num },
                  };
                }
              }
              break;
            default:
              // Fallback: attempt rich_text contains
              filterParam = {
                property: query.filterProperty,
                rich_text: { contains: query.filterValue },
              };
          }
        }
      } catch {
        // ignore filter if schema retrieval fails
      }
    }

    const anyClient = notionClient as unknown as {
      databases?: { query?: (args: unknown) => Promise<unknown> };
      request?: (args: {
        path: string;
        method: "GET" | "POST" | "PATCH" | "DELETE";
        body?: unknown;
      }) => Promise<unknown>;
    };

    const isInvalidRequestUrlError = (err: unknown): boolean => {
      // Notion sometimes returns { code: 'invalid_request_url' },
      // and in other cases the SDK throws Error('Invalid request URL')
      const code = (err as { code?: unknown } | undefined)?.code;
      if (typeof code === "string" && code.toLowerCase() === "invalid_request_url") {
        return true;
      }
      const message = err instanceof Error ? err.message : String(err ?? "");
      return /invalid request url/i.test(message);
    };

    let response: unknown | undefined;
    let lastError: unknown;

    const attempts: Array<{
      name: string;
      run: () => Promise<unknown>;
    }> = [];

    // 1) Prefer official SDK wrapper if available
    if (anyClient.databases && typeof anyClient.databases.query === "function") {
      attempts.push({
        name: "sdk.databases.query",
        run: () =>
          anyClient.databases!.query!({
            database_id: databaseId,
            page_size: pageSize,
            sorts: sortsParam,
            filter: filterParam,
          }),
      });
    }

    // 2) Low-level request() – try both URL shapes across SDK versions
    if (typeof anyClient.request === "function") {
      // a) Body carries database_id (older HTTP path)
      attempts.push({
        name: "sdk.request.databases/query",
        run: () =>
          anyClient.request!({
            path: "databases/query",
            method: "POST",
            body: {
              database_id: databaseId,
              page_size: pageSize,
              sorts: sortsParam,
              filter: filterParam,
            },
          }),
      });
      // b) Path embeds database id (newer HTTP path)
      attempts.push({
        name: "sdk.request.databases/{id}/query",
        run: () =>
          anyClient.request!({
            path: `databases/${databaseId}/query`,
            method: "POST",
            body: {
              page_size: pageSize,
              sorts: sortsParam,
              filter: filterParam,
            },
          }),
      });
    }

    // 3) Final fallback: raw HTTPS fetch
    attempts.push({
      name: "raw.fetch",
      run: async () => {
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
              filter: filterParam,
            }),
          },
        );
        if (!res.ok) {
          let bodyText: string | undefined;
          try {
            bodyText = await res.text();
          } catch {
            // ignore
          }
          if (isNotionDebugEnabled()) {
            console.error("[notion:debug] Notion API error response", {
              status: res.status,
              body: bodyText,
            });
          }
          throw new Error(`Notion API error (${res.status})`);
        }
        return res.json();
      },
    });

    for (const attempt of attempts) {
      try {
        if (isNotionDebugEnabled()) {
          console.log("[notion:debug] Notion request attempt", { attempt: attempt.name });
        }
        response = await attempt.run();
        break; // success
      } catch (err) {
        lastError = err;
        const invalidUrl = isInvalidRequestUrlError(err);
        if (isNotionDebugEnabled()) {
          console.warn("[notion:debug] Notion attempt failed", {
            attempt: attempt.name,
            error: err instanceof Error ? err.message : String(err),
            willRetry: invalidUrl,
          });
        }
        // Retry next strategy only for Invalid URL mismatch. For other errors, abort.
        if (!invalidUrl) {
          throw err;
        }
      }
    }

    if (!response) {
      throw lastError ?? new Error("Notion API リクエストに失敗しました");
    }

    const isQueryResponse = (
      value: unknown,
    ): value is { results: Array<Record<string, unknown>> } => {
      return (
        typeof value === "object" &&
        value !== null &&
        Array.isArray((value as Record<string, unknown>).results)
      );
    };

    if (!isQueryResponse(response)) {
      return { slides: [], error: "Notion API レスポンスが不正です" };
    }

    const slides = response.results
      .filter((page): page is PageObjectResponse => page.object === "page")
      .map((page) => {
        const title = getTitleText(page, query.titleProperty);
        const description = getPlainText(page, query.descriptionProperty);
        const coverUrl = getImageUrl(page, query.imageProperty);

        let extra: Record<string, string> | undefined;
        if (query.displayProperties && query.displayProperties.length > 0) {
          extra = {};
          for (const name of query.displayProperties) {
            const value = getPlainText(page, name);
            if (value != null && String(value).trim() !== "") {
              extra[name] = String(value);
            }
          }
        }

        return {
          id: page.id,
          title,
          description,
          coverUrl,
          notionUrl: createNotionUrl(page.id),
          properties: extra,
        } satisfies Slide;
      });

    let propertiesMeta: DatabasePropertiesSummary | undefined;
    if (options?.includePropertiesMeta) {
      try {
        const db = await (notionClient as Client).databases.retrieve({
          database_id: databaseId,
        });
        const all: DatabasePropertyMeta[] = [];
        const files: string[] = [];
        const displayable: string[] = [];
        let titleName: string | undefined;

        const props = (db as unknown as { properties?: Record<string, { type?: string }> }).properties ?? {};
        for (const [name, def] of Object.entries(props)) {
          const type = String((def as { type?: string }).type ?? "unknown");
          all.push({ name, type });
          if (type === "files") files.push(name);
          if (
            type === "title" ||
            type === "rich_text" ||
            type === "select" ||
            type === "multi_select" ||
            type === "status" ||
            type === "url" ||
            type === "number" ||
            type === "date"
          ) {
            displayable.push(name);
          }
          if (type === "title") titleName = name;
        }
        propertiesMeta = { all, files, displayable, titleName };
      } catch {
        // ignore meta errors
      }
    }

    if (isNotionDebugEnabled()) {
      console.log("[notion:debug] Notion slides fetched", { count: slides.length });
    }
    return { slides, propertiesMeta };
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

