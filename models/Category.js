// models/Category.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    categoryCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    categoryType: {
      type: String,
      required: true,
      enum: [
        "electronics",
        "accessories",
        "home_appliances",
        "computers",
        "mobile",
        "audio_video",
        "gaming",
        "networking",
      ],
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },
    productsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      default: "",
    },
    statusCode: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for better performance
categorySchema.index({ categoryCode: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ categoryType: 1 });
categorySchema.index({ createdAt: -1 });

// Virtual for formatted created date
categorySchema.virtual("createdDate").get(function () {
  return this.createdAt;
});

module.exports = mongoose.model("Category", categorySchema);
