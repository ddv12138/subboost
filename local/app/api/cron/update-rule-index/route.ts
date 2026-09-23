import { NextRequest, NextResponse } from "next/server";
import { withCurrentAdmin } from "@local/lib/api-auth";
import { refreshLocalRuleIndex } from "@local/lib/local-cron-jobs";

export async function POST(request: NextRequest) {
  return withCurrentAdmin(async () => {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const result = await refreshLocalRuleIndex(force);

    if (result.status === "unavailable") {
      return NextResponse.json(
        {
          success: false,
          status: result.status,
          error: result.error,
          code: "RULE_INDEX_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      source: result.index.source,
      fetchedAt: result.index.fetchedAt,
      expiresAt: result.index.expiresAt,
      diff: result.diff,
      ...(result.error ? { error: result.error } : {}),
    });
  });
}
