const mongoose = require("mongoose");

// Define the Order schema
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true, // Ensure serial numbers are unique
    },
    orderNo: {
      type: String,
      required: true,
      unique: true, // Ensure serial numbers are unique
    },
    invoiceNo: {
      type: String,
      required: true,
      // Removed unique constraint
    },
    serialNo: {
      type: Number,
      required: false,
      unique: false, // Ensure serial numbers are unique
    },
    customerName: {
      type: String,
      required: true,
    },
    customerInformation: {
      type: String,
      default: "", // Additional customer information
    },
    receiverName: {
      type: String,
      required: true, // Name of the receiver
    },
    receiverAddress: {
      type: String,
      required: true, // Address of the receiver
    },
    receiverPhoneNumber: {
      type: String,
      required: true, // Phone number of the receiver
    },
    productId: {
      type: String,
      required: false,
    },
    productName: {
      type: String,
      required: true,
    },
    productDescription: {
      type: String,
      required: false,
    },
    totalBill: {
      type: Number,
      required: true, // Total bill amount
    },
    discount: {
      type: Number,
      required: false, // Total bill amount
    },
    deliveryCharge: {
      type: Number,
      required: true, // Delivery charge
    },
    addOnRequirement: {
      type: Boolean,
      default: false, // Whether add-ons are required
    },
    isExpenseAdded: {
      type: Boolean,
      default: false, // Whether add-ons are required
    },
    addOnType: {
      type: String,
      default: "", // Type of add-on (e.g., Cake)
    },
    addOnPrice: {
      type: Number,
      default: 0,
    },
    note: {
      type: Boolean,
      default: false, // Whether a note is included
    },
    noteText: {
      type: String,
      default: "", // Text of the note
    },
    notePrice: {
      type: Number,
      default: 0, // Price of the note
    },
    paymentMethod: {
      type: String,
      required: true, // Payment method (e.g., Cash on Delivery)
    },
    grandTotal: {
      type: Number,
      required: true, // Grand total amount
    },
    amountPaid: {
      type: Number,
      required: false, // Amount paid by the customer
    },
    totalDue: {
      type: Number,
      required: true, // Total due amount
    },
    deliveryDateTime: {
      type: Date,
      required: true, // Scheduled delivery date and time
    },
    deliveredDate: {
      type: Date,
      required: false, // Scheduled delivery date and time
    },
    status: {
      type: String,
      // Default status is "Pending"
    },
    issueDate: {
      type: Date,
      required: true, // Date the order was issued
    },
    dispatchInfo: {
      type: String,
      required: false, // Date the order was issued
    },
    statusCode: {
      type: Number,
      default: 0, // Default status code is 0 (active)
    },
    createdBy: {
      type: String,
      required: true, // Track who created the order
    },
    updatedBy: {
      type: String,
      default: "", // Track who updated the order (empty initially)
    },
    canceledBy: {
      type: String,
      default: "", // Track who canceled the order (empty initially)
    },
    cancelReason: {
      type: String,
      default: "", // Store the reason for cancellation (empty initially)
    },
    imageUrl: { type: String },
    noteImageUrl: { type: String },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

// Create the Order model
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
