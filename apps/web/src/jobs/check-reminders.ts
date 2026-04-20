import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db, tasks, reminders, users } from "@academic-os/db";
import { resend, ReminderEmail } from "@academic-os/email";
import { inngest } from "../lib/inngest.js";
import * as React from "react";

export const checkReminders = inngest.createFunction(
  { id: "check-reminders", name: "Check task reminders" },
  { cron: "0 * * * *" },
  async ({ logger }) => {
    // Fetch tasks due within the next 25 hours that are not done
    const dueSoon = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        title: tasks.title,
        dueAt: tasks.dueAt,
      })
      .from(tasks)
      .where(
        and(
          sql`${tasks.dueAt} >= NOW()`,
          sql`${tasks.dueAt} <= NOW() + INTERVAL '25 hours'`,
          sql`${tasks.status} != 'done'`,
        ),
      );

    logger.info(`Found ${dueSoon.length} tasks due within 25 hours`);

    const results = await Promise.allSettled(
      dueSoon.map(async (task) => {
        // Idempotency check: skip if an email reminder was already sent
        const existingReminder = await db
          .select({ id: reminders.id })
          .from(reminders)
          .where(
            and(
              eq(reminders.taskId, task.id),
              eq(reminders.channel, "email"),
              isNotNull(reminders.sentAt),
            ),
          )
          .limit(1);

        if (existingReminder.length > 0) {
          logger.info(`Reminder already sent for task ${task.id}, skipping`);
          return;
        }

        if (!task.dueAt) {
          logger.warn(`Task ${task.id} has no dueAt, skipping`);
          return;
        }

        // Fetch user email
        const userRows = await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(eq(users.id, task.userId))
          .limit(1);

        const user = userRows[0];
        if (!user) {
          logger.warn(`User ${task.userId} not found for task ${task.id}`);
          return;
        }

        const taskUrl = `${process.env["NEXT_PUBLIC_APP_URL"] ?? ""}/tasks/${task.id}`;

        // Send email via Resend
        await resend.emails.send({
          from: "Academic OS <noreply@academic-os.app>",
          to: user.email,
          subject: ReminderEmail.subject(task.title),
          react: React.createElement(ReminderEmail, {
            taskTitle: task.title,
            dueAt: task.dueAt,
            taskUrl,
          }),
        });

        // Record the sent reminder
        await db.insert(reminders).values({
          taskId: task.id,
          userId: task.userId,
          channel: "email",
          remindAt: task.dueAt,
          sentAt: new Date(),
        });

        logger.info(`Reminder sent for task ${task.id} to ${user.email}`);
      }),
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      logger.warn(`${failed.length} reminders failed out of ${dueSoon.length}`);
      for (const failure of failed) {
        if (failure.status === "rejected") {
          logger.error(String(failure.reason));
        }
      }
    }

    return {
      processed: dueSoon.length,
      failed: failed.length,
    };
  },
);
