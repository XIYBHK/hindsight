import { NextResponse } from "next/server";
import { sdk, lowLevelClient, dataplaneBankUrl, getDataplaneHeaders } from "@/lib/hindsight-client";
import { localizeApiErrorPayload } from "@/lib/i18n/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bankId: string; operationId: string }> }
) {
  try {
    const { bankId, operationId } = await params;

    if (!bankId) {
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: "bank_id is required",
          errorKey: "api.errors.validation.bankIdRequired",
        }),
        { status: 400 }
      );
    }

    if (!operationId) {
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: "operation_id is required",
          errorKey: "api.errors.validation.operationIdRequired",
        }),
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const includePayload = url.searchParams.get("include_payload") === "true";

    const response = await sdk.getOperationStatus({
      client: lowLevelClient,
      path: { bank_id: bankId, operation_id: operationId },
      query: includePayload ? { include_payload: true } : undefined,
    });

    if (response.error) {
      console.error("API error getting operation status:", response.error);
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: "Failed to get operation status",
          errorKey: "api.errors.operations.status",
        }),
        { status: 500 }
      );
    }

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error("Error getting operation status:", error);
    return NextResponse.json(
      localizeApiErrorPayload(request, {
        error: "Failed to get operation status",
        errorKey: "api.errors.operations.status",
      }),
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bankId: string; operationId: string }> }
) {
  try {
    const { bankId, operationId } = await params;

    if (!bankId) {
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: "bank_id is required",
          errorKey: "api.errors.validation.bankIdRequired",
        }),
        { status: 400 }
      );
    }

    if (!operationId) {
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: "operation_id is required",
          errorKey: "api.errors.validation.operationIdRequired",
        }),
        { status: 400 }
      );
    }

    const url = dataplaneBankUrl(bankId, `/operations/${encodeURIComponent(operationId)}/retry`);
    const response = await fetch(url, {
      method: "POST",
      headers: getDataplaneHeaders({ "Content-Type": "application/json" }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        localizeApiErrorPayload(request, {
          error: data.detail || "Failed to retry operation",
          errorKey: "api.errors.operations.retry",
        }),
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error retrying operation:", error);
    return NextResponse.json(
      localizeApiErrorPayload(request, {
        error: "Failed to retry operation",
        errorKey: "api.errors.operations.retry",
      }),
      { status: 500 }
    );
  }
}
