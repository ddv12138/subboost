import { NextRequest } from "next/server";
import { json } from "@local/lib/http";
import { withCurrentAdmin } from "@local/lib/api-auth";
import { runLocalSubscriptionAutoUpdate } from "@local/lib/local-cron-jobs";

export async function POST(request: NextRequest) {
  return withCurrentAdmin(async () => {
    const summary = await runLocalSubscriptionAutoUpdate();
    return json({
      success: true,
      ...summary,
      timestamp: new Date().toISOString(),
    });
  });
}
