import { NextRequest, NextResponse } from "next/server";
import { sdk, lowLevelClient } from "@/lib/hindsight-client";
import { localizeApiErrorPayload } from "@/lib/i18n/api-errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const bankId = searchParams.get("bank_id");

    if (!bankId) {
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: "bank_id is required",
          errorKey: "api.errors.validation.bankIdRequired",
        }),
        { status: 400 }
      );
    }

    const decodedEntityId = decodeURIComponent(entityId);

    const response = await sdk.regenerateEntityObservations({
      client: lowLevelClient,
      path: {
        bank_id: bankId,
        entity_id: decodedEntityId,
      },
    });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error("Error regenerating entity observations:", error);
    return NextResponse.json(
      localizeApiErrorPayload(request, {
        error: "Failed to regenerate entity observations",
        errorKey: "api.errors.entities.regenerateObservations",
      }),
      { status: 500 }
    );
  }
}
