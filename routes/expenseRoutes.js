const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");

// Create a new expense
router.post("/expense", expenseController.createExpense);

// Get all expenses
router.get("/expense", expenseController.getAllExpenses);

// Update an expense
router.put("/expense/:id", expenseController.updateExpense);

// Delete an expense
router.delete("/expense/:id", expenseController.deleteExpense);

module.exports = router;
