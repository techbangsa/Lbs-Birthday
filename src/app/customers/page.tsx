import { listCachedBirthdayCustomers } from "@/lib/birthdays/customer-cache";
import { BirthdayCustomersClient } from "@/components/birthday-customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const initialCustomers = await listCachedBirthdayCustomers();

  return <BirthdayCustomersClient initialCustomers={initialCustomers} />;
}
