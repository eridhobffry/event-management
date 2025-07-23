import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  await resend.emails.send({
    from: "Event Management Hub <noreply@yourdomain.com>", // Replace with your domain
    to,
    subject,
    html,
  });
};
