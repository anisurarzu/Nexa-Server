const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    expenseName: { 
      type: String, 
      required: true,
      enum: [
        "ঘর ভাড়া",
        "বিদ্যুৎ বিল", 
        "কর্মচারী বেতন",
        "মালকেরি বাবদ",
        "দোকান খরচ",
        "বিবিধ খরচ"
      ]
    },
    amount: { 
      type: Number, 
      required: true 
    },
    reason: { 
      type: String, 
      required: false 
    },
    expenseDate: { 
      type: Date, 
      required: true 
    },
    expenseBy: { 
      type: String, 
      required: true 
    },
    createdBy: { 
      type: String, 
      required: true 
    },
    createdDate: { 
      type: Date, 
      default: Date.now 
    },
    updatedDate: { 
      type: Date, 
      default: Date.now 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);