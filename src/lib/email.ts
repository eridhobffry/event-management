import * as brevo from "@getbrevo/brevo";
import { getEmailSender } from "./config";

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const maxRetries = 3; // total attempts = 3
  const baseBackoffMs = 250;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      const sender = getEmailSender();
      sendSmtpEmail.sender = sender;
      sendSmtpEmail.to = [
        {
          email: to,
        },
      ];
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = html;

      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      if (attempt > 1) {
        console.log(`✅ Email sent successfully after retry #${attempt - 1}:`, to);
      } else {
        console.log("✅ Email sent successfully:", to);
      }
      return result;
    } catch (error) {
      lastError = error;
      console.error(
        `❌ Email sending failed (attempt ${attempt}/${maxRetries}) to ${to}:`,
        error
      );
      if (attempt < maxRetries) {
        const delay = baseBackoffMs * Math.pow(2, attempt - 1);
        await sleep(delay);
        continue;
      }
    }
  }
  throw lastError;
};

export type EmailJob = { to: string; subject: string; html: string };

export async function sendBulkEmails(
  jobs: EmailJob[],
  options?: { concurrency?: number }
): Promise<Array<PromiseSettledResult<unknown>>> {
  const concurrency = Math.max(1, options?.concurrency ?? 5);
  const results: Array<PromiseSettledResult<unknown>> = [];

  let index = 0;
  const workers: Promise<void>[] = [];

  async function worker() {
    while (true) {
      const i = index++;
      if (i >= jobs.length) break;
      const job = jobs[i];
      try {
        const value = await sendEmail(job);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  for (let w = 0; w < concurrency; w++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return results;
}
