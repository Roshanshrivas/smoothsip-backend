import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  shippingAddress: {
    address: String,
    city: String,
    state: String,
    pinCode: String,
    country: { type: String, default: 'India' }
  },
  billingAddress: { type: Object },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    sku: String,
    quantity: Number,
    price: Number,
    image: String,
    customization: Object
  }],
  subtotal: Number,
  shipping: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  couponDiscount: { type: Number, default: 0 },
  total: Number,
  paymentMethod: { type: String, enum: ['Card','UPI','COD','PayPal','Razorpay','Stripe'] },
  paymentStatus: { type: String, enum: ['Paid','Unpaid','Refunded','Failed'], default: 'Unpaid' },
  paymentDetails: Object,
  status: { type: String, enum: ['Pending','Processing','Shipped','Delivered','Cancelled','Returned'], default: 'Pending' },
  fulfillmentStatus: { type: String, enum: ['Pending','Processing','Shipped','Delivered','Cancelled'], default: 'Pending' },
  trackingNumber: String,
  shippedDate: Date,
  deliveredDate: Date,
  cancellationReason: String,
  notes: String
}, { timestamps: true });

// Generate order number before saving
orderSchema.pre('save', function() {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  }
});

export default mongoose.model('Order', orderSchema);