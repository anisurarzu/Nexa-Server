const mongoose = require("mongoose");

// Define the Order schema
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    orderNo: {
      type: String,
      required: true,
      unique: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    customerAddress: {
      type: String,
      required: true,
    },
    items: [
      {
        productId: String,
        productName: String,
        category: String,
        unitPrice: Number,
        salePrice: Number,
        quantity: Number,
        vat: {
          type: Number,
          default: 0,
        },
        tax: {
          type: Number,
          default: 0,
        },
        total: Number,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    orderDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      default: "Cash",
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Create the Order model
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
