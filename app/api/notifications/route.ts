import { requireAdmin } from "@/lib/auth";
import { fail, isSameOrigin, ok, serverError } from "@/lib/http";
import { buildNotifications } from "@/lib/notifications";
import { markNotificationsSeen } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Notification feed for the operations dashboard.
 *
 * This is a polled feed, not a push channel — the dashboard refreshes it on an
 * interval, which is what the underlying data actually supports. There is no
 * websocket or queue behind it, and the UI must not imply otherwise.
 */
export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const feed = await buildNotifications(50);
    return ok(feed);
  } catch (error) {
    return serverError("api/notifications:GET", error);
  }
}

/** Mark everything currently in the feed as read. Administrator only. */
export async function POST(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site submissions are not allowed.", 403);

  try {
    await markNotificationsSeen(new Date());
    const feed = await buildNotifications(50);
    return ok(feed);
  } catch (error) {
    return serverError("api/notifications:POST", error);
  }
}
