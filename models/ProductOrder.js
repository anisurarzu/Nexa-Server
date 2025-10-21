const mongoose = require("mongoose");

const productOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true, required: true },
    customerName: { type: String, default: "Walk-in Customer" },
    customerPhone: { type: String, default: "N/A" },
    customerAddress: { type: String, default: "N/A" },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    salePrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "pcs" },
    total: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      default: "Cash",
      enum: ["Cash", "Card", "Digital"],
    },
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Completed", "Cancelled"],
    },
    orderDate: { type: Date, default: Date.now },
    createdBy: { type: String, default: "user" },
  },
  { timestamps: true }
);

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

// NO POST SAVE HOOK HERE!

module.exports = mongoose.model("ProductOrder", productOrderSchema);
