import { z } from 'genkit';

export const SmtpConfigSchema = z.object({
  host: z.string().describe('The hostname of the SMTP server.'),
  port: z.number().describe('The port of the SMTP server.'),
  secure: z.boolean().describe('Whether to use SSL/TLS.'),
  user: z.string().describe('The username for SMTP authentication.'),
  pass: z.string().describe('The password for SMTP authentication.'),
});

export const EmailRecipientSchema = z.object({
  id: z.string(),
  name: z.string().describe('The name of the recipient.'),
  email: z.string().email().describe('The email address of the recipient.'),
});

export const EmailContentSchema = z.object({
    to: z.array(z.string().email()).describe('A list of recipient email addresses.'),
    subject: z.string().describe('The subject of the email.'),
    html: z.string().describe('The HTML body of the email.'),
});

export const EmailInputSchema = z.object({
  smtp: SmtpConfigSchema,
  content: EmailContentSchema,
});

export const EmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type SmtpConfig = z.infer<typeof SmtpConfigSchema>;
export type EmailRecipient = z.infer<typeof EmailRecipientSchema>;
export type EmailInput = z.infer<typeof EmailInputSchema>;
export type EmailOutput = z.infer<typeof EmailOutputSchema>;
