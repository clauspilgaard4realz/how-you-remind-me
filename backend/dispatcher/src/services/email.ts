import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getAuth } from 'firebase-admin/auth';
import type { TaskOccurrence, TaskTemplate } from '@hyrm/shared';
import { getFirebaseApp } from '../lib/firebase.js';

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!isEmailConfigured()) {
    throw new Error('SMTP is not configured');
  }
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function getOwnerNotificationEmail(ownerId: string): Promise<string | null> {
  const override = process.env.NOTIFICATION_EMAIL?.trim();
  if (override) return override;

  try {
    const user = await getAuth(getFirebaseApp()).getUser(ownerId);
    return user.email ?? null;
  } catch {
    return null;
  }
}

function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? 'https://juice-da-car.web.app';
}

export function buildEmailContent(
  occurrence: TaskOccurrence,
  template: TaskTemplate
): { subject: string; html: string; text: string } {
  const url = `${appBaseUrl()}/?occurrence=${encodeURIComponent(occurrence.id)}`;
  const subject = `⏰ Påmindelse: ${template.title}`;
  const text = [
    `Påmindelse: ${template.title}`,
    '',
    'Tryk linket for at åbne opgaven og markere den som klaret:',
    url,
  ].join('\n');
  const html = `<!DOCTYPE html>
<html lang="da">
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
  <h2 style="margin:0 0 12px">⏰ Påmindelse</h2>
  <p style="font-size:18px;margin:0 0 16px"><strong>${escapeHtml(template.title)}</strong></p>
  <p style="margin:0 0 16px">Det er tid til at huske denne opgave.</p>
  <p style="margin:0 0 24px">
    <a href="${url}" style="display:inline-block;padding:10px 16px;background:#0284c7;color:#fff;text-decoration:none;border-radius:8px">
      Åbn opgave
    </a>
  </p>
  <p style="font-size:12px;color:#64748b;margin:0">How You Remind Me</p>
</body>
</html>`;
  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendReminderEmail(
  to: string,
  occurrence: TaskOccurrence,
  template: TaskTemplate
): Promise<void> {
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? 'reminders@localhost';
  const { subject, html, text } = buildEmailContent(occurrence, template);
  await getTransporter().sendMail({ from, to, subject, html, text });
}
