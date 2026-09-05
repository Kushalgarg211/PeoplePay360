import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

// Create reusable Gmail transporter
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: ENV.GMAIL_USER,
    pass: ENV.GMAIL_APP_PASSWORD,
  },
});

// Verify connection on startup (non-fatal)
transporter.verify((err) => {
  if (err) {
    console.warn('[Email] Gmail transporter not ready:', err.message);
  } else {
    console.log('[Email] Gmail transporter ready ✓');
  }
});

// ─── Send payslip PDF as email attachment ─────────────────────────────────────
export async function sendPayslipEmail(opts: {
  to:          string;
  employeeName: string;
  payrunName:  string;
  period:      string;
  netSalary:   string;
  pdfBuffer:   Buffer;
  payslipId:   string;
}): Promise<void> {
  const { to, employeeName, payrunName, period, netSalary, pdfBuffer, payslipId } = opts;

  await transporter.sendMail({
    from:    `"PeoplePay360 Payroll" <${ENV.GMAIL_USER}>`,
    to,
    subject: `Your Payslip – ${payrunName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:24px;border-radius:8px;">
        <div style="background:#2D1457;padding:20px 24px;border-radius:6px 6px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">PeoplePay360</h1>
          <p style="color:#C49BD4;margin:4px 0 0;font-size:13px;">Payroll Management System</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 6px 6px;border:1px solid #e5e7eb;border-top:none;">
          <p style="color:#374151;font-size:15px;">Dear <strong>${employeeName}</strong>,</p>
          <p style="color:#6B7280;font-size:14px;">
            Your payslip for <strong>${payrunName}</strong> (${period}) is ready. Please find it attached to this email.
          </p>
          <div style="background:#F5EFF9;border:1px solid #C49BD4;border-radius:6px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#2D1457;font-size:13px;font-weight:600;">NET SALARY</p>
            <p style="margin:6px 0 0;color:#6B3A7D;font-size:24px;font-weight:700;">${netSalary}</p>
          </div>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">
            This is an automated email from PeoplePay360. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename:    `payslip-${payslipId}.pdf`,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

// ─── Send password reset email ────────────────────────────────────────────────
export async function sendPasswordResetEmail(opts: {
  to:        string;
  name:      string;
  resetLink: string;
}): Promise<void> {
  const { to, name, resetLink } = opts;

  await transporter.sendMail({
    from:    `"PeoplePay360 Security" <${ENV.GMAIL_USER}>`,
    to,
    subject: 'Reset Your PeoplePay360 Password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:24px;border-radius:8px;">
        <div style="background:#2D1457;padding:20px 24px;border-radius:6px 6px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">PeoplePay360</h1>
          <p style="color:#C49BD4;margin:4px 0 0;font-size:13px;">Password Reset Request</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 6px 6px;border:1px solid #e5e7eb;border-top:none;">
          <p style="color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#6B7280;font-size:14px;">
            We received a request to reset your PeoplePay360 password. Click the button below to set a new password.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${resetLink}"
               style="display:inline-block;background:#6B3A7D;color:#fff;padding:12px 32px;border-radius:6px;
                      font-weight:600;font-size:14px;text-decoration:none;">
              Reset Password
            </a>
          </div>
          <p style="color:#9CA3AF;font-size:12px;">
            This link expires in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email.
          </p>
          <p style="color:#9CA3AF;font-size:11px;word-break:break-all;">
            Or copy this link: ${resetLink}
          </p>
        </div>
      </div>
    `,
  });
}
