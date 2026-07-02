import { getCampaignSettingsModel } from "@/lib/birthdays/settings";
import { getBirthdayCustomers } from "@/lib/shopify/customers";
import { BirthdayCustomersClient } from "@/components/birthday-customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const settings = await getCampaignSettingsModel();
  const initialCustomers = await getBirthdayCustomers({
    namespace: settings.birthdayNamespace,
    key: settings.birthdayKey,
  });

  // Convert/map fields if needed to match the expected format
  const mappedCustomers = initialCustomers.map(customer => ({
    id: customer.id,
    displayName: customer.displayName,
    email: customer.email,
    birthdayValue: customer.birthdayValue,
    tags: customer.tags,
  }));

  return <BirthdayCustomersClient initialCustomers={mappedCustomers} />;
}
