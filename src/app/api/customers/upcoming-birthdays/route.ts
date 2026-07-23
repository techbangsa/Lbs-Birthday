import { getCampaignSettingsModel } from "@/lib/birthdays/settings";
import { getUpcomingBirthdays } from "@/lib/birthdays/upcoming";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCampaignSettingsModel();
    const upcoming = await getUpcomingBirthdays({
      timeZone: settings.timezone,
      limit: 5,
    });

    return Response.json(upcoming);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load upcoming birthdays" },
      { status: 500 },
    );
  }
}
