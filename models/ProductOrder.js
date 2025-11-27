const mongoose = require("mongoose");

const productOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true, required: true },
    customerName: { type: String, default: "Walk-in Customer" },
    customerPhone: { type: String, default: "N/A" },
    customerAddress: { type: String, default: "N/A" },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    category: { type: String, default: "General" },
    unitPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "pcs" },
    total: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      default: "Cash",
      enum: ["Cash", "Card", "Digital", "Mobile Banking", "Bank Transfer", "Due", "Partial"],
    },
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Processing", "Completed", "Cancelled"],
    },
    orderDate: { type: Date, default: Date.now },
    createdBy: { type: String, default: "user" },
    updatedBy: { type: String, default: "user" },
  },
  { timestamps: true }
);

// Auto-calculate due amount before saving
productOrderSchema.pre("save", function (next) {
  // Calculate total if not provided
  if (!this.total) {
    this.total = (this.salePrice || 0) * (this.quantity || 0);
  }
  
  // Calculate grandTotal if not provided
  if (!this.grandTotal) {
    this.grandTotal = this.total;
  }
  
  // Calculate totalAmount if not provided
  if (!this.totalAmount) {
    this.totalAmount = this.total;
  }

  // Auto-calculate due amount based on payment method
  if (this.paymentMethod === "Cash" || 
      this.paymentMethod === "Card" || 
      this.paymentMethod === "Digital" ||
      this.paymentMethod === "Mobile Banking" ||
      this.paymentMethod === "Bank Transfer") {
    // Full payment methods - no due amount
    this.paidAmount = this.grandTotal;
    this.dueAmount = 0;
  } else if (this.paymentMethod === "Due") {
    // Due payment - nothing paid
    this.paidAmount = 0;
    this.dueAmount = this.grandTotal;
  } else if (this.paymentMethod === "Partial") {
    // Partial payment - calculate due amount
    this.paidAmount = this.paidAmount || 0;
    this.dueAmount = Math.max(0, this.grandTotal - this.paidAmount);
    
    // Ensure paidAmount doesn't exceed grandTotal
    if (this.paidAmount > this.grandTotal) {
      this.paidAmount = this.grandTotal;
      this.dueAmount = 0;
    }
  }

  // Ensure due amount is never negative
  if (this.dueAmount < 0) {
    this.dueAmount = 0;
  }

  next();
});

// Only the pre-save hook for order number
productOrderSchema.pre("save", async function (next) {
  if (this.isNew) {
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, "");

    const lastOrder = await this.constructor
      .findOne({ orderNo: new RegExp(`^ORD${dateString}`) })
      .sort({ orderNo: -1 })
      .select("orderNo");

    let sequence = 1;
    if (lastOrder && lastOrder.orderNo) {
      const lastSeq = parseInt(lastOrder.orderNo.slice(-3));
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    this.orderNo = `ORD${dateString}${sequence.toString().padStart(3, "0")}`;
  }
  next();
});

module.exports = mongoose.model("ProductOrder", productOrderSchema);