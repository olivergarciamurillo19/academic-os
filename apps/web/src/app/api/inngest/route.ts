import { serve } from "inngest/next";

import { checkReminders } from "../../../jobs/check-reminders.js";
import { inngest } from "../../../lib/inngest.js";

const handler = serve({
  client: inngest,
  functions: [checkReminders],
});

export const { GET, POST, PUT } = handler;
