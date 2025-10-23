import { NextResponse } from "next/server";
import { FALLBACK_SLIDES, fetchSlides } from "@/lib/notion";

const isNotionDebugEnabled = (): boolean => {
  const flag = process.env["DEBUG_NOTION"]?.toLowerCase();
  const enabledByFlag = flag === "1" || flag === "true" || flag === "on";
  const enabledByEnv = process.env["NODE_ENV"] !== "production";
  return enabledByFlag || enabledByEnv;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Ensure serverless function runs on every request
export const revalidate = 0; // Disable ISR for this API route

const parseNumber = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseSortDirection = (
  value: string | null,
): "ascending" | "descending" | undefined => {
  if (!value) return undefined;
  if (value === "ascending" || value === "descending") {
    return value;
  }
  if (value === "asc") return "ascending";
  if (value === "desc") return "descending";
  return undefined;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const databaseId = searchParams.get("databaseId") ?? undefined;
  const titleProperty = searchParams.get("titleProperty") ?? undefined;
  const descriptionProperty = searchParams.get("descriptionProperty") ?? undefined;
  const imageProperty = searchParams.get("imageProperty") ?? undefined;
  const pageSize = parseNumber(searchParams.get("pageSize"));
  const sortProperty = searchParams.get("sortProperty") ?? undefined;
  const sortDirection = parseSortDirection(searchParams.get("sortDirection"));
  const filterProperty = searchParams.get("filterProperty") ?? undefined;
  const filterOperator = (searchParams.get("filterOperator") ?? undefined) as
    | "contains"
    | "equals"
    | undefined;
  const filterValue = searchParams.get("filterValue") ?? undefined;

  const { slides, error } = await fetchSlides({
    databaseId,
    titleProperty,
    descriptionProperty,
    imageProperty,
    pageSize,
    sortProperty,
    sortDirection,
    filterProperty,
    filterOperator,
    filterValue,
  });

  if (isNotionDebugEnabled()) {
    console.log("[notion:debug] /api/slides response", {
      providedDatabaseId: Boolean(databaseId),
      slidesCount: slides.length,
      hasError: Boolean(error),
    });
  }

  if (error) {
    return NextResponse.json(
      {
        slides: slides.length > 0 ? slides : FALLBACK_SLIDES,
        error,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    slides,
  });
}

