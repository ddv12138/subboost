import { duplicateSubscriptionResponse } from "@local/lib/subscription-route-handlers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  return duplicateSubscriptionResponse(id);
}
