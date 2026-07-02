import { runScanRequestSchema } from "@/lib/birthdays/contracts";
import { runBirthdayScan } from "@/lib/birthdays/runner";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  return secret === env.CRON_SECRET;
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = runScanRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        message: "Invalid scan request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (parsed.data.trigger === "CRON" && !isAuthorizedCronRequest(request)) {
    return Response.json({ message: "Unauthorized cron invocation." }, { status: 401 });
  }

  const run = await runBirthdayScan(parsed.data);

  return Response.json(run, {
    status: run.status === "FAILED" ? 500 : 200,
  });
}