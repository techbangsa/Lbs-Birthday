import { listBirthdayRuns } from "@/lib/birthdays/runner";

export const dynamic = "force-dynamic";

export async function GET() {
  const runs = await listBirthdayRuns();
  return Response.json(runs);
}