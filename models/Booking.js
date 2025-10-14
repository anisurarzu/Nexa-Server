const mongoose = require("mongoose");

// Define Booking schema
const BookingSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    nidPassport: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    hotelName: {
      type: String,
      required: true,
    },
    hotelID: {
      type: Number,
      required: false,
    },

    roomCategoryID: {
      type: String,
      required: true,
    },
    roomCategoryName: {
      type: String,
      required: true,
    },
    roomNumberID: {
      type: String,
      required: true,
    },
    roomNumberName: {
      type: String,
      required: true,
    },
    roomPrice: {
      type: Number,
      required: true,
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    nights: {
      type: Number,
      required: true,
    },
    adults: {
      type: Number,
      required: false,
    },
    children: {
      type: Number,
      required: false,
    },
    totalBill: {
      type: Number,
      required: true,
    },
    advancePayment: {
      type: Number,
      required: true,
    },
    duePayment: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    transactionId: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      required: false,
    },
    isKitchen: {
      type: Boolean, // Updated to Boolean
      required: false,
    },
    extraBed: {
      type: Boolean, // Updated to Boolean
      required: false,
    },
    bookedBy: {
      type: String,
      required: true,
    },
    bookedByID: {
      type: String,
      required: true,
    },
    updatedByID: {
      type: String,
    },
    bookingID: {
      type: String,
      required: true,
    },
    bookingNo: {
      type: String,
      required: true,
    },
    serialNo: {
      type: Number,
      required: false,
    },
    kitchenTotalBill: {
      type: Number,
      required: false,
    },
    extraBedTotalBill: {
      type: Number,
      required: false,
    },
    reference: {
      type: String,
      required: false,
    },
    createTime: {
      type: Date,
      default: Date.now,
    },
    statusID: {
      type: Number,
      default: 1,
    },
    canceledBy: {
      type: String,
      default: 1,
    },
    reason: { type: String, required: false },
  },
  { timestamps: true }
); // Automatically create createdAt and updatedAt fields.....

module.exports = mongoose.model("Booking", BookingSchema);
