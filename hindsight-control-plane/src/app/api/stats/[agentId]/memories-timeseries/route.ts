import { NextRequest, NextResponse } from "next/server";
import { dataplaneBankUrl, getDataplaneHeaders } from "@/lib/hindsight-client";
import { localizeApiErrorPayload } from "@/lib/i18n/api-errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const period = request.nextUrl.searchParams.get("period") || "7d";
    const timeField = request.nextUrl.searchParams.get("time_field") || "created_at";
    const url = dataplaneBankUrl(
      agentId,
      `/stats/memories-timeseries?period=${encodeURIComponent(period)}&time_field=${encodeURIComponent(timeField)}`
    );
    const upstream = await fetch(url, { headers: getDataplaneHeaders() });
    const body = await upstream.json();
    if (!upstream.ok && body && typeof body === "object") {
      const errorBody = body as Record<string, unknown> & { errorKey: string };
      errorBody.errorKey =
        typeof errorBody.errorKey === "string"
          ? errorBody.errorKey
          : "api.errors.stats.memoriesTimeseries";
      return NextResponse.json(localizeApiErrorPayload(request, errorBody), {
        status: upstream.status,
      });
    }
    return NextResponse.json(body, { status: upstream.status });
  } catch (error) {
    console.error("Error fetching memories timeseries:", error);
    return NextResponse.json(
      localizeApiErrorPayload(request, {
        error: "Failed to fetch memories timeseries",
        errorKey: "api.errors.stats.memoriesTimeseries",
      }),
      { status: 500 }
    );
  }
}
