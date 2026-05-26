import { NextRequest, NextResponse } from "next/server";
import { sdk, lowLevelClient } from "@/lib/hindsight-client";
import { localizeApiErrorPayload } from "@/lib/i18n/api-errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chunkId: string }> }
) {
  try {
    const { chunkId } = await params;

    const response = await sdk.getChunk({
      client: lowLevelClient,
      path: { chunk_id: chunkId },
    });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error("Error fetching chunk:", error);
    return NextResponse.json(
      localizeApiErrorPayload(request, {
        error: "Failed to fetch chunk",
        errorKey: "api.errors.chunks.fetch",
      }),
      { status: 500 }
    );
  }
}
