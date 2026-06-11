import { DashboardClient } from "@/components/dashboard-client";
import { listBirthdayRuns } from "@/lib/birthdays/runner";
import { getCampaignSettings } from "@/lib/birthdays/settings";
import { getCustomersPage } from "@/lib/shopify/customers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [settings, runs, initialCustomerPage] = await Promise.all([
    getCampaignSettings(),
    listBirthdayRuns(),
    (async () => {
      const currentSettings = await getCampaignSettings();
      return getCustomersPage({
        namespace: currentSettings.birthdayNamespace,
        key: currentSettings.birthdayKey,
        pageSize: 25,
      });
    })(),
  ]);

  return <DashboardClient initialSettings={settings} initialRuns={runs} initialCustomerPage={initialCustomerPage} />;
}
