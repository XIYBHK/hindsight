import { NextResponse } from "next/server";
import { sdk, lowLevelClient } from "@/lib/hindsight-client";
import { localizeApiErrorPayload } from "@/lib/i18n/api-errors";

export async function POST(request: Request, { params }: { params: Promise<{ bankId: string }> }) {
  try {
    const { bankId } = await params;

    if (!bankId) {
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: "bank_id is required",
          errorKey: "api.errors.validation.bankIdRequired",
        }),
        { status: 400 }
      );
    }

    const response = await sdk.recoverConsolidation({
      client: lowLevelClient,
      path: { bank_id: bankId },
    });

    if (response.error) {
      console.error("API error recovering consolidation:", response.error);
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: "Failed to recover consolidation",
          errorKey: "api.errors.consolidation.recover",
        }),
        { status: 500 }
      );
    }

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error("Error recovering consolidation:", error);
    return NextResponse.json(
      localizeApiErrorPayload(request, {
        error: "Failed to recover consolidation",
        errorKey: "api.errors.consolidation.recover",
      }),
      { status: 500 }
    );
  }
}
