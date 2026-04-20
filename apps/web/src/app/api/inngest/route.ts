import { serve } from "inngest/next";

import { checkReminders } from "../../../jobs/check-reminders.js";
import { ingestDocument } from "../../../jobs/ingest-document.js";
import {
  syncICalIntegrations,
  syncICalOnDemand,
} from "../../../jobs/sync-ical.js";
import { inngest } from "../../../lib/inngest.js";

const handler = serve({
  client: inngest,
  functions: [checkReminders, ingestDocument, syncICalIntegrations, syncICalOnDemand],
});

export const { GET, POST, PUT } = handler;
