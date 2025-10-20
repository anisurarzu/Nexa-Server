const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const upload = require("../middleware/upload");

// Create a new order
router.post("/orders", orderController.createOrder);

// Get all orders (excluding deleted ones)
router.get("/orders", orderController.getOrders);
router.get("/getFinancialSummary", orderController.getFinancialSummary);
router.get("/getDailySummary", orderController.getDailySummary);

// Get a specific order by ID
router.get("/orders/:id", orderController.getOrderById);

// Get order information by orderNo
router.get("/getOrderInfo/:orderNo", orderController.getOrderInfoByOrderNo);

// Get multiple orders by invoiceNo
router.get(
  "/getOrdersByInvoiceNo/:invoiceNo",
  orderController.getOrdersByInvoiceNo
);

// Update an order by ID
router.put("/orders/:id", orderController.updateOrder);

// Soft delete an order by ID
router.delete("/orders/:id", orderController.deleteOrder);

// New route for image upload
// router.post(
//   "/image-upload/:id",
//   upload.single("image"),
//   orderController.uploadOrderImage
// );
// router.post(
//   "/note-image-upload/:id",
//   upload.single("noteImageUrl"),
//   orderController.uploadOrderNoteImage
// );

module.exports = router;
