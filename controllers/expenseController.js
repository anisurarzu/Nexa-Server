const Expense = require("../models/Expense");
const Order = require("../models/Order");

// Create a new expense
exports.createExpense = async (req, res) => {
  try {
    const {
      cashInHand,
      flowerCost,
      deliveryCost,
      additionalCost,
      createdBy,
      grandTotal,
      invoiceNo,
      totalCost,
      createdDate,
      invoiceId, // This is actually the _id of the Order
    } = req.body;

    // Validate required fields
    if (!invoiceNo) {
      return res
        .status(400)
        .json({ message: "Invoice Number field is required." });
    }
    if (!flowerCost) {
      return res
        .status(400)
        .json({ message: "Flower Cost field is required." });
    }
    if (!createdBy) {
      return res.status(400).json({ message: "Created By field is required." });
    }
    if (!grandTotal) {
      return res
        .status(400)
        .json({ message: "Grand Total field is required." });
    }
    if (!totalCost) {
      return res.status(400).json({ message: "Total Cost field is required." });
    }
    if (!cashInHand) {
      return res
        .status(400)
        .json({ message: "Cash In Hand field is required." });
    }

    // Check if an expense with the same invoice number already exists
    const existingExpense = await Expense.findOne({ invoiceId });
    if (existingExpense) {
      return res.status(400).json({
        message: "An expense with this invoice number already exists.",
      });
    }

    const newExpense = new Expense({
      cashInHand,
      flowerCost,
      deliveryCost,
      additionalCost,
      createdBy,
      grandTotal,
      invoiceNo,
      totalCost,
      createdDate,
      invoiceId, // This is the _id of the Order
    });

    // Save the expense
    const savedExpense = await newExpense.save();

    // Now, update the corresponding Order collection to set the `isExpenseAdded` flag
    const updatedOrder = await Order.findByIdAndUpdate(
      invoiceId, // Use invoiceId here directly, as it is the _id of the Order
      {
        expenseCreateTime: new Date(),
        isExpenseAdded: true,
      },
      { new: true } // Return the updated document
    );

    if (!updatedOrder) {
      return res.status(400).json({ message: "Order not found." });
    }

    // Return the saved expense and updated order
    res.status(200).json({
      expense: savedExpense,
      order: updatedOrder,
    });
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    res.status(500).json({ message: "Failed to create expense", error });
  }
};

// all expenses
exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.status(200).json({ expenses });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses", error });
  }
};

// Update an expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cashInHand,
      flowerCost,
      deliveryCost,
      additionalCost,
      createdBy,
      grandTotal,
      invoiceNo,
      totalCost,
      createdDate,
      updatedDate,
      invoiceId,
    } = req.body;

    // Validate required fields
    if (!invoiceNo) {
      return res
        .status(400)
        .json({ message: "Invoice Number field is required." });
    }
    if (!flowerCost) {
      return res
        .status(400)
        .json({ message: "Flower Cost field is required." });
    }

    if (!createdBy) {
      return res.status(400).json({ message: "Created By field is required." });
    }
    if (!grandTotal) {
      return res
        .status(400)
        .json({ message: "Grand Total field is required." });
    }
    if (!totalCost) {
      return res.status(400).json({ message: "Total Cost field is required." });
    }
    if (!cashInHand) {
      return res
        .status(400)
        .json({ message: "Cash In Hand field is required." });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      {
        cashInHand,
        flowerCost,
        deliveryCost,
        additionalCost,
        createdBy,
        grandTotal,
        invoiceNo,
        totalCost,
        createdDate,
        updatedDate,
        invoiceId,
      },
      { new: true }
    );

    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: "Failed to update expense", error });
  }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedExpense = await Expense.findByIdAndDelete(id);

    if (!deletedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete expense", error });
  }
};
