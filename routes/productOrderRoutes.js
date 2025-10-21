const express = require("express");
const router = express.Router();
const {
  createOrder,
  updateOrder,
  deleteOrder,
  getAllOrders,
  getOrderById,
} = require("../controllers/productOrderController");

// ✅ Create a new order
router.post("/", createOrder);

// ✅ Get all orders (with pagination, filters)
router.get("/", getAllOrders);

// ✅ Get a single order by ID
router.get("/:id", getOrderById);

// ✅ Update an order
router.put("/:id", updateOrder);

// ✅ Delete an order
router.delete("/:id", deleteOrder);

module.exports = router;
