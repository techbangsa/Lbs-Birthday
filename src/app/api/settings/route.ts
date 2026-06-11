import { settingsInputSchema } from "@/lib/birthdays/contracts";
import { getCampaignSettings, updateCampaignSettings } from "@/lib/birthdays/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getCampaignSettings();
  return Response.json(settings);
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const parsed = settingsInputSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const [firstField, firstMessages] = Object.entries(issues.fieldErrors)[0] ?? [];
    const firstError = firstField ? `${firstField}: ${firstMessages?.[0]}` : issues.formErrors[0];
    return Response.json(
      {
        message: `Validation failed: ${firstError}`,
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const settings = await updateCampaignSettings(parsed.data);
  return Response.json(settings);
}