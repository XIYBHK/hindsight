import { NextRequest, NextResponse } from "next/server";
import { dataplaneBankUrl, getDataplaneHeaders } from "@/lib/hindsight-client";
import { localizeApiErrorPayload } from "@/lib/i18n/api-errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bankId: string }> }
) {
  try {
    const { bankId } = await params;

    const url = dataplaneBankUrl(bankId, "/export");
    const response = await fetch(url, {
      headers: getDataplaneHeaders(),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          ...data,
          errorKey: data.errorKey ?? "api.errors.banks.exportTemplate",
        }),
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error exporting bank template:", error);
    return NextResponse.json(
      localizeApiErrorPayload(request, {
        error: "Failed to export bank template",
        errorKey: "api.errors.banks.exportTemplate",
      }),
      { status: 500 }
    );
  }
}
