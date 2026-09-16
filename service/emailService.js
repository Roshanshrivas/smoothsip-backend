import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    logger.warn('Email send skipped: No recipient');
    return { success: false, error: 'No recipient' };
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ''), // fallback plain text
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Email send error (${to}):`, error.message);
    // Return failure but DO NOT throw – we want the broadcast to continue
    return { success: false, error: error.message };
  }
};