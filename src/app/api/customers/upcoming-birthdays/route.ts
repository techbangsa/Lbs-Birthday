import { getCampaignSettingsModel } from "@/lib/birthdays/settings";
import { getUpcomingBirthdays } from "@/lib/shopify/upcoming-birthdays";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getCampaignSettingsModel();
  const upcoming = await getUpcomingBirthdays({
    namespace: settings.birthdayNamespace,
    key: settings.birthdayKey,
    timeZone: settings.timezone,
    limit: 5,
  });

  return Response.json(upcoming);
}
