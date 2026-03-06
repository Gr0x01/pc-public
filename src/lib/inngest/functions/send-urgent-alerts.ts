import { inngest } from "../client";
import { sendUrgentAlerts } from "@/lib/email/alerts";

export const urgentAlerts = inngest.createFunction(
  {
    id: "send-urgent-alerts",
    concurrency: [{ limit: 3 }],
  },
  { event: "alerts/urgent.requested" },
  async ({ event, step }) => {
    const alertsSent = await step.run("send-alerts", async () => {
      return sendUrgentAlerts(event.data.itemId);
    });

    return { itemId: event.data.itemId, alertsSent };
  }
);
