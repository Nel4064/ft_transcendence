import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';

// Returns '' when the secret is missing, so the app still starts without Mailtrap
function readSecret(name: string): string {
  try {
    return fs.readFileSync(`/run/secrets/${name}`, 'utf8').trim();
  } catch {
    return '';
  }
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from = process.env.MAIL_FROM || 'CineClub <no-reply@cineclub.local>';
  private readonly transporter = this.createTransporter();

  private createTransporter(): nodemailer.Transporter | null {
    const host = process.env.SMTP_HOST;
    const user = readSecret('smtp_user');
    const pass = readSecret('smtp_pw');
    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured: emails will be printed in the logs');
      return null;
    }
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: { user, pass },
    });
  }

  // Throws if sending fails: the caller decides whether that blocks the operation
  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[mail] to=${to} subject="${subject}"\n${text}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
