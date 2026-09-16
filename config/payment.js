import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createRazorpayOrder = async (amount, currency = 'INR') => {
  return await razorpay.orders.create({
    amount: amount * 100,
    currency,
    receipt: `receipt_${Date.now()}`
  });
};

export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const body = orderId + '|' + paymentId;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  return expected === signature;
};