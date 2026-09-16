import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    general: {
      storeName: { type: String, default: 'Tumbler Store' },
      storeEmail: { type: String, default: 'support@tumbler.com' },
      storePhone: { type: String, default: '+91 987 654 3210' },
      storeAddress: { type: String, default: '123, Tumbler Street, Kolkata, West Bengal, India - 700001' },
      storeLanguage: { type: String, default: 'English' },
      currency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
      timezone: { type: String, default: 'Asia/Kolkata (GMT+05:30)' },
      dateFormat: { type: String, default: 'DD MMM YYYY' },
      timeFormat: { type: String, default: '12 Hours' },
      maintenanceMode: { type: Boolean, default: false },
    },
    email: {
      driver: { type: String, default: 'SMTP' },
      host: { type: String, default: 'smtp.gmail.com' },
      port: { type: String, default: '587' },
      username: { type: String, default: '' },
      password: { type: String, default: '' },
      encryption: { type: String, default: 'TLS' },
    },
    sms: {
      provider: { type: String, default: 'Twilio' },
      accountSid: { type: String, default: '' },
      authToken: { type: String, default: '' },
      fromNumber: { type: String, default: '' },
    },
    seo: {
      metaTitle: { type: String, default: 'Tumbler Store - Premium Quality Tumblers' },
      metaDescription: { type: String, default: 'Buy premium quality tumblers online at best prices. Custom designs, fast delivery and secure payments.' },
      metaKeywords: { type: String, default: 'tumbler, water bottle, custom tumbler, travel mug, thermos' },
    },
    security: {
      twoFactor: { type: Boolean, default: false },
      loginNotification: { type: Boolean, default: false },
      strongPassword: { type: Boolean, default: false },
      sessionTimeout: { type: Boolean, default: false },
    },
    backup: {
      dbLastBackup: { type: String, default: '18 May 2025, 03:30 AM' },
      fileLastBackup: { type: String, default: '18 May 2025, 03:30 AM' },
      systemVersion: { type: String, default: '2.4.1' },
    },
  },
  { timestamps: true }
);

// Singleton: ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('Settings', settingsSchema);