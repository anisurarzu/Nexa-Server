const Expense = require("../models/Expense");

// Create a new expense
exports.createExpense = async (req, res) => {
  try {
    const {
      expenseName,
      amount,
      reason,
      expenseDate,
      expenseBy,
      createdBy,
    } = req.body;

    // Validate required fields
    if (!expenseName) {
      return res.status(400).json({ message: "Expense Name field is required." });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid Amount field is required." });
    }
    if (!reason) {
      return res.status(400).json({ message: "Reason field is required." });
    }
    if (!expenseDate) {
      return res.status(400).json({ message: "Expense Date field is required." });
    }
    if (!expenseBy) {
      return res.status(400).json({ message: "Expense By field is required." });
    }
    if (!createdBy) {
      return res.status(400).json({ message: "Created By field is required." });
    }

    const newExpense = new Expense({
      expenseName,
      amount: Number(amount),
      reason,
      expenseDate,
      expenseBy,
      createdBy,
    });

    // Save the expense
    const savedExpense = await newExpense.save();

    // Return the saved expense
    res.status(200).json({
      message: "Expense created successfully",
      expense: savedExpense,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create expense", error: error.message });
  }
};

// Get all expenses
exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.status(200).json({ 
      message: "Expenses fetched successfully",
      expenses 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses", error: error.message });
  }
};

// Get expense by ID
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({
      message: "Expense fetched successfully",
      expense
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expense", error: error.message });
  }
};

// Update an expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      expenseName,
      amount,
      reason,
      expenseDate,
      expenseBy,
      createdBy,
    } = req.body;

    // Validate required fields
    if (!expenseName) {
      return res.status(400).json({ message: "Expense Name field is required." });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid Amount field is required." });
    }
    if (!reason) {
      return res.status(400).json({ message: "Reason field is required." });
    }
    if (!expenseDate) {
      return res.status(400).json({ message: "Expense Date field is required." });
    }
    if (!expenseBy) {
      return res.status(400).json({ message: "Expense By field is required." });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      {
        expenseName,
        amount: Number(amount),
        reason,
        expenseDate,
        expenseBy,
        updatedDate: Date.now(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({
      message: "Expense updated successfully",
      expense: updatedExpense
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update expense", error: error.message });
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

    res.status(200).json({ 
      message: "Expense deleted successfully",
      deletedExpense 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete expense", error: error.message });
  }
};

// Get expenses by date range
exports.getExpensesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const expenses = await Expense.find({
      expenseDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ expenseDate: -1 });

    res.status(200).json({
      message: "Expenses fetched successfully",
      expenses
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses by date range", error: error.message });
  }
};

// Get expenses by category
exports.getExpensesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const expenses = await Expense.find({ expenseName: category }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Expenses fetched successfully",
      expenses
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses by category", error: error.message });
  }
};

// Get expense statistics
exports.getExpenseStats = async (req, res) => {
  try {
    const stats = await Expense.aggregate([
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" },
          averageExpense: { $avg: "$amount" },
          expenseCount: { $sum: 1 },
          maxExpense: { $max: "$amount" },
          minExpense: { $min: "$amount" }
        }
      }
    ]);

    // Get this month's expenses
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthStats = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          thisMonthExpenses: { $sum: "$amount" },
          thisMonthCount: { $sum: 1 }
        }
      }
    ]);

    const result = {
      totalExpenses: stats[0]?.totalExpenses || 0,
      averageExpense: stats[0]?.averageExpense || 0,
      expenseCount: stats[0]?.expenseCount || 0,
      maxExpense: stats[0]?.maxExpense || 0,
      minExpense: stats[0]?.minExpense || 0,
      thisMonthExpenses: thisMonthStats[0]?.thisMonthExpenses || 0,
      thisMonthCount: thisMonthStats[0]?.thisMonthCount || 0
    };

    res.status(200).json({
      message: "Expense statistics fetched successfully",
      stats: result
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expense statistics", error: error.message });
  }
};