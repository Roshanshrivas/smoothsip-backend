// backend/utils/emailTemplates.js
import { sendEmail } from '../service/emailService.js';

// ─── Password Reset OTP Email ───
export const sendPasswordResetOTPEmail = async (to, otp) => {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F4F5F7;">
      <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #00A9C0; font-size: 28px; margin: 0;">SmoothSip</h1>
        </div>

        <h2 style="color: #1E293B; font-size: 18px; margin: 0 0 8px;">Password Reset Request</h2>
        <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Use the code below to reset your password. This code is valid for <strong>10 minutes</strong>.
        </p>

        <div style="background: #E6F9FA; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #00A9C0;">
            ${otp}
          </div>
        </div>

        <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 0;">
          If you didn't request this, you can safely ignore this email. Your password won't change until you use this code to create a new one.
        </p>

        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

        <p style="color: #94A3B8; font-size: 11px; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} SmoothSip. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Reset your SmoothSip password',
    html,
  });
};