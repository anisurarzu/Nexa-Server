const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, unique: true }, // Unique ID generated from backend
    productName: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    purchaseBy: { type: String },
    createdBy: { type: String },
    updatedBy: { type: String },
    createdDate: {
      type: Date,
      required: true,
    },
    imageUrl: { type: String },
    stockQTY: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
