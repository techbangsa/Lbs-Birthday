import { after } from "next/server";
import { runScanRequestSchema } from "@/lib/birthdays/contracts";
import { runBirthdayScan } from "@/lib/birthdays/runner";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

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

  // Pre-create the run record in "RUNNING" state
  const run = await db.birthdayScanRun.create({
    data: {
      dryRun: parsed.data.dryRun,
      trigger: parsed.data.trigger,
    },
  });

  // Execute the actual scan asynchronously after response is sent
  after(async () => {
    try {
      await runBirthdayScan({
        ...parsed.data,
        existingRunId: run.id,
      });
    } catch (error) {
      console.error("Background birthday scan error:", error);
    }
  });

  // Return the running run response immediately
  return Response.json({
    id: run.id,
    status: run.status,
    dryRun: run.dryRun,
    trigger: run.trigger,
    startedAt: run.startedAt.toISOString(),
    finishedAt: null,
    matchedCount: 0,
    createdCount: 0,
    skippedCount: 0,
    failedCount: 0,
    summary: parsed.data.dryRun
      ? "Preview started in background."
      : "Live run started in background.",
    errorMessage: null,
    results: [],
  });
}