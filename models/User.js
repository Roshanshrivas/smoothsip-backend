import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    avatar: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: {
      type: String,
      enum: ["Active", "Blocked", "Inactive"],
      default: "Active",
    },
    addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Address' }],
    lastLogin: { type: Date },
    ordersCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    refreshToken: { type: String },

    // ─── NEW FIELDS ──────────────────────────────
    description: { type: String, default: '' },        // bio
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'], default: 'Prefer not to say' },
    preferences: {
      orderUpdates: { type: Boolean, default: true },
      shippingUpdates: { type: Boolean, default: true },
      offersDeals: { type: Boolean, default: true },
      coupons: { type: Boolean, default: true },
      accountAlerts: { type: Boolean, default: true },
   },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);