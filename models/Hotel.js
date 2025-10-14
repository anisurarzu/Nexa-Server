const mongoose = require("mongoose");

// Auto-increment for sequential ID
const autoIncrement = require("mongoose-sequence")(mongoose);

// Define Bookings schema
const BookingSchema = new mongoose.Schema({
  guestName: {
    type: String,
    required: false,
  },
  checkIn: {
    type: Date,
    required: false,
  },
  checkOut: {
    type: Date,
    required: false,
  },
  bookedBy: {
    type: String,
    required: false,
  },
  paymentDetails: {
    totalBill: {
      type: Number,
      required: false,
    },
    advancePayment: {
      type: Number,
      required: false,
    },
    duePayment: {
      type: Number,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    transactionId: {
      type: String,
      required: false,
    },
  },
});

// Define RoomNumbers schema
const RoomNumberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  bookedDates: {
    type: [String], // Array of booked date strings
    required: false,
  },
  bookings: [BookingSchema], // Array of BookingSchema
});

// Define RoomCategories schema
const RoomCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  roomNumbers: [RoomNumberSchema], // Array of RoomNumberSchema
});

// Define Hotel schema
const HotelSchema = new mongoose.Schema(
  {
    hotelName: {
      type: String,
      required: true,
    },
    hotelID: {
      type: Number,
      required: true,
    },
    hotelDescription: {
      type: String,
      required: true,
    },
    roomCategories: [RoomCategorySchema], // Array of RoomCategorySchema
    createTime: {
      type: Date,
      default: Date.now, // Automatically set the creation time
    },
  },
  { timestamps: true }
);

// Add auto-increment to the hotelID field
HotelSchema.plugin(autoIncrement, {
  inc_field: "hotelID",
  start_seq: 1,
});

// Export the Hotel model
module.exports = mongoose.model("Hotel", HotelSchema);
