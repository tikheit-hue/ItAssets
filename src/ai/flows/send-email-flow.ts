'use server';

/**
 * @fileOverview A Genkit flow for sending emails using Nodemailer with dynamic SMTP configuration.
 *
 * - sendEmail - A function that dispatches an email.
 * - EmailInput - The input type for the sendEmail function, including SMTP config and email content.
 */

import { ai } from '@/ai/genkit';
import { EmailInputSchema, EmailOutputSchema, type EmailInput, type EmailOutput } from '@/ai/schemas/email-schema';
import nodemailer from 'nodemailer';

export async function sendEmail(input: EmailInput): Promise<EmailOutput> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: EmailInputSchema,
    outputSchema: EmailOutputSchema,
  },
  async (input) => {
    const { smtp, content } = input;
    
    if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass) {
        return {
            success: false,
            message: "SMTP configuration is incomplete. Please provide host, port, user, and password.",
        };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
        tls: {
            rejectUnauthorized: false
        }
      });
      
      if (content.subject === 'AssetGuard Verification') {
        await transporter.verify();
        return {
          success: true,
          message: 'Connection verified successfully.',
        };
      }

      await transporter.sendMail({
        from: `AssetGuard <${smtp.user}>`,
        to: content.to,
        subject: content.subject,
        html: content.html,
      });

      return {
        success: true,
        message: 'Email sent successfully.',
      };

    } catch (error: any) {
        let errorMessage = 'Failed to send email. Please check your SMTP configuration and network connection.';
        if (error.code === 'EAUTH') {
            errorMessage = 'Authentication failed. Please check your username and password/API key.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            message: errorMessage,
        };
    }
  }
);
