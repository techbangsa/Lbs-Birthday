import { getCampaignSettingsModel } from "@/lib/birthdays/settings";
import { getCustomersPage } from "@/lib/shopify/customers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 25;
  const pageSize = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 25;

  const settings = await getCampaignSettingsModel();
  const result = await getCustomersPage({
    namespace: settings.birthdayNamespace,
    key: settings.birthdayKey,
    after,
    pageSize,
  });

  return Response.json(result);
}