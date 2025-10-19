const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Order routes
router.post("/orders", orderController.createOrder);
router.get("/orders", orderController.getOrders);
router.get("/orders/:id", orderController.getOrderById);
router.put("/orders/:id", orderController.updateOrder);
router.delete("/orders/:id", orderController.deleteOrder);

// Financial summary routes (only these two as requested)
router.get("/getFinancialSummary", orderController.getFinancialSummary);
router.get("/getDailySummary", orderController.getDailySummary);

module.exports = router;
