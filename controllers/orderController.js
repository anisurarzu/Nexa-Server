const Order = require("../models/Order");

// Helper function to generate order number (MMDD + sequential number)
const generateOrderNo = async () => {
  const currentDate = new Date();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = currentDate.getDate().toString().padStart(2, "0");
  const datePrefix = `${month}${day}`;

  // Find today's orders to get the next sequential number
  const todayOrders = await Order.find({
    orderNo: { $regex: `^${datePrefix}` },
  }).sort({ orderNo: -1 });

  let nextNumber = 1;
  if (todayOrders.length > 0) {
    const lastOrderNo = todayOrders[0].orderNo;
    const lastNumber = parseInt(lastOrderNo.slice(-2));
    nextNumber = lastNumber + 1;
  }

  return `${datePrefix}${nextNumber.toString().padStart(2, "0")}`;
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      items,
      paymentMethod = "Cash",
      deliveryCharge = 0,
      discount = 0,
      createdBy = "system",
    } = req.body;

    // Validate required fields
    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({
        success: false,
        error: "Customer name, phone and address are required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Order must contain at least one item",
      });
    }

    // Generate order numbers
    const orderNo = await generateOrderNo();
    const orderId = orderNo; // Using same as orderNo for simplicity

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => {
      const itemTotal =
        item.salePrice * item.quantity + (item.vat || 0) + (item.tax || 0);
      return sum + itemTotal;
    }, 0);

    const grandTotal = totalAmount + deliveryCharge - discount;

    // Create order
    const newOrder = new Order({
      orderId,
      orderNo,
      customerName,
      customerPhone,
      customerAddress,
      items,
      totalAmount,
      grandTotal,
      paymentMethod,
      deliveryCharge,
      discount,
      orderDate: new Date(),
      createdBy,
      status: "Pending",
      statusCode: 0,
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
      details: error.message,
    });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    let filter = { statusCode: { $ne: 255 } };

    // Add status filter if provided
    if (status && status !== "all") {
      filter.status = status;
    }

    // Add date range filter if provided
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
      details: error.message,
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      statusCode: { $ne: 255 },
    });

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
      details: error.message,
    });
  }
};

// Update order
const updateOrder = async (req, res) => {
  try {
    const {
      items,
      deliveryCharge = 0,
      discount = 0,
      status,
      ...updateData
    } = req.body;

    // If items are updated, recalculate totals
    if (items && Array.isArray(items)) {
      const totalAmount = items.reduce((sum, item) => {
        const itemTotal =
          item.salePrice * item.quantity + (item.vat || 0) + (item.tax || 0);
        return sum + itemTotal;
      }, 0);

      updateData.totalAmount = totalAmount;
      updateData.grandTotal = totalAmount + deliveryCharge - discount;
      updateData.items = items;
    }

    if (deliveryCharge !== undefined)
      updateData.deliveryCharge = deliveryCharge;
    if (discount !== undefined) updateData.discount = discount;
    if (status) updateData.status = status;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
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
      details: error.message,
    });
  }
};

// Delete order (soft delete)
const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        statusCode: 255,
        status: "Cancelled",
      },
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
      details: error.message,
    });
  }
};

// Get financial summary (Daily and Monthly)
const getFinancialSummary = async (req, res) => {
  try {
    const currentDate = new Date();

    // Daily Summary (Today)
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dailySummary = await Order.aggregate([
      {
        $match: {
          statusCode: { $ne: 255 },
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
      },
      {
        $group: {
          _id: null,
          dailySales: { $sum: "$grandTotal" },
          totalOrders: { $sum: 1 },
          totalItems: {
            $sum: {
              $reduce: {
                input: "$items",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.quantity"] },
              },
            },
          },
        },
      },
    ]);

    // Monthly Summary (Current Month)
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const monthlySummary = await Order.aggregate([
      {
        $match: {
          statusCode: { $ne: 255 },
          createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          monthlySales: { $sum: "$grandTotal" },
          totalOrders: { $sum: 1 },
          totalItems: {
            $sum: {
              $reduce: {
                input: "$items",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.quantity"] },
              },
            },
          },
        },
      },
    ]);

    const result = {
      daily: {
        sales: dailySummary.length > 0 ? dailySummary[0].dailySales : 0,
        orders: dailySummary.length > 0 ? dailySummary[0].totalOrders : 0,
        items: dailySummary.length > 0 ? dailySummary[0].totalItems : 0,
      },
      monthly: {
        sales: monthlySummary.length > 0 ? monthlySummary[0].monthlySales : 0,
        orders: monthlySummary.length > 0 ? monthlySummary[0].totalOrders : 0,
        items: monthlySummary.length > 0 ? monthlySummary[0].totalItems : 0,
      },
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch financial summary",
      details: error.message,
    });
  }
};

// Get daily summary for last 7 days
const getDailySummary = async (req, res) => {
  try {
    const currentDate = new Date();
    const last7Days = [];

    // Generate last 7 days dates
    for (let i = 6; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      last7Days.push({
        date: new Date(date.setHours(0, 0, 0, 0)),
        dateString: date.toISOString().split("T")[0],
      });
    }

    const dailyData = [];

    for (const day of last7Days) {
      const startOfDay = new Date(day.date);
      const endOfDay = new Date(day.date);
      endOfDay.setHours(23, 59, 59, 999);

      const daySummary = await Order.aggregate([
        {
          $match: {
            statusCode: { $ne: 255 },
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },
        {
          $group: {
            _id: null,
            dailySales: { $sum: "$grandTotal" },
            totalOrders: { $sum: 1 },
            totalItems: {
              $sum: {
                $reduce: {
                  input: "$items",
                  initialValue: 0,
                  in: { $add: ["$$value", "$$this.quantity"] },
                },
              },
            },
          },
        },
      ]);

      dailyData.push({
        date: day.dateString,
        dailySales: daySummary.length > 0 ? daySummary[0].dailySales : 0,
        totalOrders: daySummary.length > 0 ? daySummary[0].totalOrders : 0,
        totalItems: daySummary.length > 0 ? daySummary[0].totalItems : 0,
      });
    }

    res.status(200).json({
      success: true,
      data: dailyData,
    });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch daily summary",
      details: error.message,
    });
  }
};

// Export all functions
module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getFinancialSummary,
  getDailySummary,
};
