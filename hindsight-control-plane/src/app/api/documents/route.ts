import { NextRequest, NextResponse } from "next/server";
import { sdk, lowLevelClient } from "@/lib/hindsight-client";
import { localizeApiErrorPayload } from "@/lib/i18n/api-errors";

export async function GET(request: NextRequest) {
  try {
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

    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;

    const response = await sdk.listDocuments({
      client: lowLevelClient,
      path: { bank_id: bankId },
      query: { limit, offset },
    });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      localizeApiErrorPayload(request, {
        error: "Failed to fetch documents",
        errorKey: "api.errors.documents.fetchList",
      }),
      { status: 500 }
    );
  }
}
