import { settingsInputSchema } from "./src/lib/birthdays/contracts";

const data = {
  "id": 1,
  "enabled": false,
  "timezone": "Asia/Jakarta",
  "birthdayNamespace": "custom",
  "birthdayKey": "birthday",
  "compareMode": "MONTH_DAY",
  "createdAt": "2026-05-13T10:10:51.085Z",
  "updatedAt": "2026-05-14T00:05:09.901Z",
  "lastRunAt": null,
  "lastDryRunAt": "2026-05-13T10:17:31.995Z"
};

const result = settingsInputSchema.safeParse(data);
if (!result.success) {
  console.log(JSON.stringify(result.error.flatten(), null, 2));
} else {
  console.log("Validation passed");
}
