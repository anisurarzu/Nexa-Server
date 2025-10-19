const Order = require("../models/Order");

// Test function to check if controller is working
const testFunction = (req, res) => {
  res.json({ message: "Controller is working!" });
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const { customerName, customerPhone, customerAddress, items } = req.body;

    // Generate order number
    const currentDate = new Date();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const day = currentDate.getDate().toString().padStart(2, "0");
    const orderNo = `${month}${day}01`;

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => {
      return sum + item.salePrice * item.quantity;
    }, 0);

    const newOrder = new Order({
      orderId: orderNo,
      orderNo: orderNo,
      customerName,
      customerPhone,
      customerAddress,
      items,
      totalAmount,
      grandTotal: totalAmount,
      orderDate: new Date(),
      createdBy: "system",
      status: "Pending",
    });

    await newOrder.save();

    res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: newOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create order",
    });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ statusCode: { $ne: 255 } }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch order",
    });
  }
};

// Update order
const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update order",
    });
  }
};

// Delete order
const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { statusCode: 255, status: "Cancelled" },
      { new: true }
    );
    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete order",
    });
  }
};

// Financial summary
const getFinancialSummary = async (req, res) => {
  try {
    const currentDate = new Date();

    // Today's sales
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dailySales = await Order.aggregate([
      {
        $match: {
          statusCode: { $ne: 255 },
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          sales: { $sum: "$grandTotal" },
          orders: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        daily: {
          sales: dailySales.length > 0 ? dailySales[0].sales : 0,
          orders: dailySales.length > 0 ? dailySales[0].orders : 0,
        },
        monthly: {
          sales: 0,
          orders: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch financial summary",
    });
  }
};

// Daily summary
const getDailySummary = async (req, res) => {
  try {
    const dailyData = [
      { date: "2024-01-01", dailySales: 1000, totalOrders: 5, totalItems: 10 },
      { date: "2024-01-02", dailySales: 1500, totalOrders: 7, totalItems: 15 },
    ];

    res.status(200).json({
      success: true,
      data: dailyData,
    });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch daily summary",
    });
  }
};

// Export all functions
module.exports = {
  testFunction,
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getFinancialSummary,
  getDailySummary,
};
