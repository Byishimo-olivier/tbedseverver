import nodemailer from "nodemailer";
import twilio from "twilio";
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger";

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: twilio.Twilio;

  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // Use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });

    // Initialize Twilio client
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  private loadTemplate(
    templateName: string,
    replacements: { [key: string]: string }
  ): string {
    const templatePath = path.join(
      __dirname,
      "../../templates",
      `${templateName}.html`
    );
    let template = fs.readFileSync(templatePath, "utf8");
    for (const key in replacements) {
      template = template.replace(
        new RegExp(`{{${key}}}`, "g"),
        replacements[key]
      );
    }
    return template;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });
      logger.info(`Email sent successfully to ${to}`);
    } catch (error) {
      logger.error("Error sending email:", error);
      throw error;
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const verificationToken = token;
    const html = this.loadTemplate("verify-email", {
      verificationLink,
      verificationToken,
    });
    await this.sendEmail(to, "Email Verification", html);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const resetToken = token;
    const html = this.loadTemplate("reset-password", { resetLink, resetToken });
    await this.sendEmail(to, "Password Reset Request", html);
  }

  async send2FACode(to: string, code: string): Promise<void> {
    const message = `
      Your verification code is: ${code}
      Please use this code to complete your login.
      This code is valid for 5 minutes.
    `;
    await this.sendSMS(to, message);
  }

  async sendSMS(to: string, message: string): Promise<void> {
    try {
      await this.twilioClient.messages.create({
        body: message,
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
      });
      logger.info(`SMS sent successfully to ${to}`);
    } catch (error) {
      logger.error("Error sending SMS:", error);
      throw error;
    }
  }
  // Add a new method to send project stage alerts
  async sendProjectStageAlert(
    to: string,
    stage: string,
    projectId: string
  ): Promise<void> {
    const message = `Stage ${stage} for project ${projectId} has been created.`;
    await this.sendEmail(to, "Project Stage Alert", message);
    await this.sendSMS(to, message);
  }

  // Add this new public method
  public async sendTemplateEmail(
    to: string,
    subject: string,
    templateName: string,
    replacements: { [key: string]: string }
  ): Promise<void> {
    const html = this.loadTemplate(templateName, replacements);
    await this.sendEmail(to, subject, html);
  }
}

export const notificationService = new NotificationService();
