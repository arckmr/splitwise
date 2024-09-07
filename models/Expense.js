const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  date: { type: Date, default: Date.now },
  splitMethod: {
    type: String,
    enum: ["equally", "byPercentage", "byShares"],
    default: "equally",
  },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  splitAmong: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      share: Number,
    },
  ],
  settlements: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      amount: Number,
      method: { type: String, enum: ["cash", "paytm", "credit"] },
    },
  ],
});

module.exports = mongoose.model("Expense", expenseSchema);
