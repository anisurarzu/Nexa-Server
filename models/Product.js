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
    createdDate: { type: Date, required: true },
    imageUrl: { type: String },
    stockQTY: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 🧩 Auto-generate productId
productSchema.pre("save", async function (next) {
  if (this.isNew) {
    const prefix = "PRODUCT25";
    const lastProduct = await this.constructor
      .findOne({ productId: new RegExp(`^${prefix}`) })
      .sort({ productId: -1 })
      .select("productId");

    let sequence = 1;
    if (lastProduct && lastProduct.productId) {
      const lastSeq = parseInt(lastProduct.productId.slice(prefix.length));
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    this.productId = `${prefix}${sequence.toString().padStart(3, "0")}`;
  }
  next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
