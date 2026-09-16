// server/controllers/public/contactController.js
import ContactMessage from '../../models/ContactMessage.js';
import { sendEmail } from '../../service/emailService.js'; // adjust path if different

// ──────────────────────────────────────────────
// PUBLIC: Submit a contact form
// Anyone can call this. Rate-limited at the route level.
// ──────────────────────────────────────────────
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Message must be at least 10 characters',
      });
    }

    if (message.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long (max 5000 characters)',
      });
    }

    // Save to database
    const contactMsg = await ContactMessage.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    // ── Notify admin ──
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

    if (adminEmail) {
      sendEmail({
        to: adminEmail,
        subject: `📬 New Contact: ${subject}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;">
            <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
              <h2 style="color:#00C2D6;margin:0 0 16px;">New Contact Form Submission</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#6b7280;width:100px;"><strong>From:</strong></td>
                    <td style="padding:8px 0;color:#111827;">${name}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;"><strong>Email:</strong></td>
                    <td style="padding:8px 0;color:#111827;">
                      <a href="mailto:${email}" style="color:#00C2D6;">${email}</a>
                    </td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;"><strong>Subject:</strong></td>
                    <td style="padding:8px 0;color:#111827;">${subject}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;"><strong>Received:</strong></td>
                    <td style="padding:8px 0;color:#111827;">${new Date().toLocaleString('en-IN')}</td></tr>
              </table>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
              <div style="background:#f9fafb;padding:16px;border-radius:8px;white-space:pre-wrap;color:#374151;line-height:1.6;">${message}</div>
              <p style="margin-top:20px;font-size:12px;color:#9ca3af;">
                Reply to <a href="mailto:${email}" style="color:#00C2D6;">${email}</a> to respond.
              </p>
            </div>
          </div>
        `,
      }).catch((err) => console.error('Admin notification email failed:', err));
    }

    // ── Confirmation to user ──
    sendEmail({
      to: email,
      subject: `We received your message — ${process.env.APP_NAME || 'Tumbleré'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
            <h2 style="color:#00C2D6;margin:0 0 12px;">Thanks for reaching out, ${name}!</h2>
            <p style="color:#374151;line-height:1.6;">
              We've received your message and our team will get back to you within 24 hours.
            </p>
            <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;color:#4b5563;font-size:14px;">
              <strong>Subject:</strong> ${subject}<br>
              <strong>Your message:</strong>
              <div style="margin-top:8px;white-space:pre-wrap;">${message}</div>
            </div>
            <p style="color:#6b7280;font-size:14px;">
              Need urgent help? Call us at +91 98765 43210.
            </p>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
              — The ${process.env.APP_NAME || 'Tumbleré'} Team
            </p>
          </div>
        </div>
      `,
    }).catch((err) => console.error('User confirmation email failed:', err));

    return res.status(201).json({
      success: true,
      message: 'Your message has been sent. We will get back to you soon.',
      id: contactMsg._id,
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send your message. Please try again.',
    });
  }
};