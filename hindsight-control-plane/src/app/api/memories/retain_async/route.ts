import { NextRequest, NextResponse } from "next/server";
import { sdk, lowLevelClient } from "@/lib/hindsight-client";
import { localizeApiErrorPayload } from "@/lib/i18n/api-errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bankId = body.bank_id || body.agent_id;

    if (!bankId) {
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: "bank_id is required",
          errorKey: "api.errors.validation.bankIdRequired",
        }),
        { status: 400 }
      );
    }

    const { items } = body;

    const response = await sdk.retainMemories({
      client: lowLevelClient,
      path: { bank_id: bankId },
      body: { items, async: true },
    });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error("Error batch retain async:", error);
    return NextResponse.json(
      localizeApiErrorPayload(request, {
        error: "Failed to batch retain async",
        errorKey: "api.errors.memories.retainAsync",
      }),
      { status: 500 }
    );
  }
}
