const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true },
    invoiceId: { type: String, required: true },
    flowerCost: { type: Number, required: true },
    deliveryCost: { type: Number, required: true },
    additionalCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    cashInHand: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    createdBy: { type: String, required: true },
    createdDate: { type: Date, default: Date.now },
    updatedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
