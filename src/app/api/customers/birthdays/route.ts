import { listCachedBirthdayCustomers } from "@/lib/birthdays/customer-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const customers = await listCachedBirthdayCustomers();

    return Response.json({ customers });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load birthday customers" },
      { status: 500 }
    );
  }
}
