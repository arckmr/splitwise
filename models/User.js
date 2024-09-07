const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // For email/password login
  otp: { type: String }, // Dummy OTP for simplicity
  otpExpiration: {
    type: Date, // Store OTP expiration time
  },
});

module.exports = mongoose.model("User", userSchema);
