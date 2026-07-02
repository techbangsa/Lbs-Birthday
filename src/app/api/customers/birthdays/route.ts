import { getCampaignSettingsModel } from "@/lib/birthdays/settings";
import { getBirthdayCustomers } from "@/lib/shopify/customers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCampaignSettingsModel();
    const customers = await getBirthdayCustomers({
      namespace: settings.birthdayNamespace,
      key: settings.birthdayKey,
    });

    return Response.json({ customers });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load birthday customers" },
      { status: 500 }
    );
  }
}
