// server/controllers/public/bulkInquiryController.js
import BulkInquiry from '../../models/BulkInquiry.js';
import { sendEmail } from '../../service/emailService.js';

// ──────────────────────────────────────────────
// PUBLIC: Submit a bulk/custom inquiry
// ──────────────────────────────────────────────
export const submitBulkInquiry = async (req, res) => {
  try {
    const { name, email, phone, company, inquiryType, quantity, message } = req.body;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone and message are required',
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number',
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Message must be at least 10 characters',
      });
    }

    const inquiry = await BulkInquiry.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      company: (company || '').trim(),
      inquiryType: ['bulk', 'corporate', 'gifting', 'collaboration', 'other'].includes(inquiryType)
        ? inquiryType
        : 'bulk',
      quantity: (quantity || '').trim(),
      message: message.trim(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    const appName = process.env.APP_NAME || 'Smooth Sip';

    const inquiryLabel = {
      bulk: 'Bulk Order',
      corporate: 'Corporate',
      gifting: 'Gifting',
      collaboration: 'Collaboration',
      other: 'Other',
    }[inquiry.inquiryType];

    // ── Notify admin ──
    if (adminEmail) {
      sendEmail({
        to: adminEmail,
        subject: `🎁 New ${inquiryLabel} Inquiry — ${name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;">
            <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
              <h2 style="color:#00C2D6;margin:0 0 16px;">New ${inquiryLabel} Inquiry</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#6b7280;width:120px;"><strong>Name:</strong></td>
                    <td style="padding:8px 0;color:#111827;">${name}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;"><strong>Email:</strong></td>
                    <td style="padding:8px 0;color:#111827;">
                      <a href="mailto:${email}" style="color:#00C2D6;">${email}</a>
                    </td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;"><strong>Phone:</strong></td>
                    <td style="padding:8px 0;color:#111827;">
                      <a href="tel:${phone}" style="color:#00C2D6;">${phone}</a>
                    </td></tr>
                ${company ? `<tr><td style="padding:8px 0;color:#6b7280;"><strong>Company:</strong></td>
                    <td style="padding:8px 0;color:#111827;">${company}</td></tr>` : ''}
                <tr><td style="padding:8px 0;color:#6b7280;"><strong>Type:</strong></td>
                    <td style="padding:8px 0;color:#111827;">${inquiryLabel}</td></tr>
                ${quantity ? `<tr><td style="padding:8px 0;color:#6b7280;"><strong>Quantity:</strong></td>
                    <td style="padding:8px 0;color:#111827;">${quantity}</td></tr>` : ''}
                <tr><td style="padding:8px 0;color:#6b7280;"><strong>Received:</strong></td>
                    <td style="padding:8px 0;color:#111827;">${new Date().toLocaleString('en-IN')}</td></tr>
              </table>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
              <div style="background:#f9fafb;padding:16px;border-radius:8px;white-space:pre-wrap;color:#374151;line-height:1.6;">${message}</div>
            </div>
          </div>
        `,
      }).catch((err) => console.error('Admin bulk inquiry email failed:', err));
    }

    // ── Confirmation to user ──
    sendEmail({
      to: inquiry.email,
      subject: `We received your inquiry — ${appName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
            <h2 style="color:#00C2D6;margin:0 0 12px;">Thanks for reaching out, ${name}!</h2>
            <p style="color:#374151;line-height:1.6;">
              We've received your inquiry. Our team will review your details and get back to you within 1–2 business days.
            </p>
            <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;color:#4b5563;font-size:14px;">
              <strong>Your message:</strong>
              <div style="margin-top:8px;white-space:pre-wrap;">${message}</div>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;">— The ${appName} Team</p>
          </div>
        </div>
      `,
    }).catch((err) => console.error('User bulk confirmation email failed:', err));

    return res.status(201).json({
      success: true,
      message: 'Thank you! We will get back to you within 1–2 business days.',
      id: inquiry._id,
    });
  } catch (error) {
    console.error('Bulk inquiry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit inquiry. Please try again.',
    });
  }
};