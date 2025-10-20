const mongoose = require("mongoose"); // Add this line

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, unique: true },
    productName: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    purchaseBy: { type: String },
    purchaseDate: { type: Date },
    createdBy: { type: String },
    updatedBy: { type: String },
    unitPrice: { type: Number, required: true },
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
