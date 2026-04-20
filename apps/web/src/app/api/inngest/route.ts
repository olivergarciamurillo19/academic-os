import { serve } from "inngest/next";

import { checkReminders } from "../../../jobs/check-reminders.js";
import { ingestDocument } from "../../../jobs/ingest-document.js";
import { syncICalIntegrations } from "../../../jobs/sync-ical.js";
import { inngest } from "../../../lib/inngest.js";

const handler = serve({
  client: inngest,
  functions: [checkReminders, ingestDocument, syncICalIntegrations],
});

export const { GET, POST, PUT } = handler;
