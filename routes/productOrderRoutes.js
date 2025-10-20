const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getFinancialSummary,
  getDailySummary,
} = require("../controllers/productOrderController");

// @route   POST /api/product-orders
// @desc    Create a new product order
// @access  Public
router.post("/", createOrder);

// @route   GET /api/product-orders
// @desc    Get all product orders with filtering and pagination
// @access  Public
router.get("/", getAllOrders);

// @route   GET /api/product-orders/:id
// @desc    Get single order by ID
// @access  Public
router.get("/:id", getOrderById);

// @route   PUT /api/product-orders/:id
// @desc    Update an order
// @access  Public
router.put("/:id", updateOrder);

// @route   DELETE /api/product-orders/:id
// @desc    Delete an order
// @access  Public
router.delete("/:id", deleteOrder);

// @route   GET /api/product-orders/summary/financial
// @desc    Get financial summary
// @access  Public
router.get("/summary/financial", getFinancialSummary);

// @route   GET /api/product-orders/summary/daily
// @desc    Get daily summary for charts
// @access  Public
router.get("/summary/daily", getDailySummary);

module.exports = router;
