import * as brevo from "@getbrevo/brevo";

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
);

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: "Event Management Hub",
      email: "eridhobffry@googlemail.com",
    };
    sendSmtpEmail.to = [
      {
        email: to,
      },
    ];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("✅ Email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
};
