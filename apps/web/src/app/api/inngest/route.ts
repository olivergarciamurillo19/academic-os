import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest.js";
import { checkReminders } from "../../../jobs/check-reminders.js";

const handler = serve({
  client: inngest,
  functions: [checkReminders],
});

export const { GET, POST, PUT } = handler;
