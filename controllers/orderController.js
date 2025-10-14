const Order = require("../models/Order");
const Product = require("../models/Product");

// Helper function to generate a serial number
const generateSerialNo = async () => {
  try {
    // Find the last order by insertion order (using `_id` in descending order)
    const lastOrder = await Order.findOne().sort({ _id: -1 });

    // Increment serial number based on the last serialNo, or start at 1 if no previous order exists
    const newSerialNo = lastOrder ? lastOrder.serialNo + 1 : 1;

    return newSerialNo;
  } catch (error) {
    console.error("Error generating serial number:", error);
    throw new Error("Could not generate serial number");
  }
};

const generateOrderNo = async () => {
  const currentDate = new Date();

  // Get current month and day
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0"); // Month, zero-padded
  const day = currentDate.getDate().toString().padStart(2, "0"); // Day, zero-padded

  // Generate the prefix for the order number (without year)
  const datePrefix = `${month}${day}`;

  // Fetch all order numbers that match the current date prefix
  const orders = await Order.find(
    { orderNo: { $regex: `^${datePrefix}` } }, // Match orders with the same date prefix
    { orderNo: 1 }
  );

  // Determine the maximum serial number for today's orders
  let maxSerialNo = 0;
  orders.forEach((order) => {
    if (order.orderNo) {
      // Extract the serial number from the orderNo
      const serialNo = parseInt(order.orderNo.slice(-2), 10); // Last 2 digits for serial
      if (serialNo > maxSerialNo) {
        maxSerialNo = serialNo;
      }
    }
  });

  // Increment the serial number
  const newSerialNo = maxSerialNo + 1;

  // Generate the order number (without year)
  const orderNo = `${datePrefix}${newSerialNo.toString().padStart(2, "0")}`;

  return orderNo;
};

exports.createOrder = async (req, res) => {
  try {
    const { prevInvoiceNo, createdBy, ...orderData } = req.body; // Extract prevInvoiceNo and other fields
    const serialNo = await generateSerialNo(); // Generate serial number

    let orderNo;
    let orderId;
    let invoiceNo;

    // Check if prevInvoiceNo is provided in the payload
    if (prevInvoiceNo) {
      // Use the prevInvoiceNo as the orderNo and orderId
      orderNo = await generateOrderNo();
      orderId = await generateOrderNo();
      invoiceNo = prevInvoiceNo;
    } else {
      // Generate new orderNo and orderId if prevInvoiceNo is not provided
      orderNo = await generateOrderNo();
      orderId = await generateOrderNo();
      invoiceNo = await generateOrderNo();
    }

    console.log("orderNo", orderNo);
    console.log("orderId", orderId);

    // Ensure orderNo and serialNo are properly populated
    if (!orderNo || !serialNo) {
      return res
        .status(400)
        .json({ error: "Order number or serial number is missing." });
    }

    // Create a new order with all fields from the request body
    const newOrder = new Order({
      ...orderData, // Spread the rest of the order data
      orderNo,
      orderId,
      invoiceNo,
      serialNo,
      createdBy,
      issueDate: new Date(), // Set the issue date to the current date
      status: "Pending", // Default status
      statusCode: 0, // Default status code
    });

    await newOrder.save();
    res.status(200).json(newOrder);
  } catch (error) {
    console.error("Error creating order:", error);

    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      // This error will only occur for serialNo since it's unique
      return res.status(400).json({
        error: "Duplicate serial number.",
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to create order",
      details: error.message,
    });
  }
};
// Get all orders except deleted ones
// exports.getOrders = async (req, res) => {
//   const { status, deliveryDate } = req.query; // Get filters from query parameters

//   try {
//     // Build the filter object dynamically based on the received query parameters
//     const filter = { statusCode: { $ne: 255 } };

//     // Add status filter if provided
//     if (status) {
//       filter.status = status;
//     }

//     // Add delivery date filter if provided
//     if (deliveryDate) {
//       const startOfDay = new Date(deliveryDate);
//       startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00:00.000)

//       const endOfDay = new Date(deliveryDate);
//       endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59.999)

//       // Filter orders where deliveryDateTime is within the same day
//       filter.deliveryDateTime = {
//         $gte: startOfDay,
//         $lte: endOfDay,
//       };
//     }

//     // Execute the query with dynamic filters and sorting
//     const orders = await Order.find(filter).sort({
//       deliveryDateTime: 1,
//       createdAt: -1,
//     }); // Sort by deliveryDateTime (earliest first), then createdAt (newest first)

//     res.status(200).json(orders);
//   } catch (error) {
//     res.status(500).json({
//       error: "Failed to fetch orders",
//       details: error.message,
//     });
//   }
// };

exports.getOrders = async (req, res) => {
  const { status, deliveryDate } = req.query;

  try {
    const filter = { statusCode: { $ne: 255 } };

    if (status) {
      filter.status = status;
    }

    if (deliveryDate) {
      const startOfDay = new Date(deliveryDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(deliveryDate);
      endOfDay.setHours(23, 59, 59, 999);

      filter.deliveryDateTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const orders = await Order.find(filter).sort({
      createdAt: -1, // Show latest orders first
      deliveryDateTime: 1, // Optional: sort by delivery time if createdAt is the same
    });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch orders",
      details: error.message,
    });
  }
};

// Get Order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      statusCode: { $ne: 255 },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.status(200).json(order);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch order", details: error.message });
  }
};
// get GrandTotal by orderNo
exports.getOrderInfoByOrderNo = async (req, res) => {
  try {
    const order = await Order.findOne(
      {
        orderNo: req.params.orderNo, // Fetch by orderNo
        statusCode: { $ne: 255 }, // Exclude orders with statusCode 255
      }
      // { grandTotal: 1, _id: 0 } // Only return the grandTotal field, exclude _id
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch order", details: error.message });
  }
};

// @desc Get multiple orders by invoiceNo
exports.getOrdersByInvoiceNo = async (req, res) => {
  const { invoiceNo } = req.params;

  try {
    // Find all orders that have the same invoiceNo
    const orders = await Order.find({ invoiceNo: invoiceNo });

    // If no orders are found, return a 404 error
    if (orders.length === 0) {
      return res
        .status(404)
        .json({ error: "No orders found for this invoice number" });
    }

    // Return the list of orders
    res.status(200).json(orders);
  } catch (error) {
    // Handle any unexpected errors
    res.status(500).json({ error: error.message });
  }
};

// Update Order
exports.updateOrder = async (req, res) => {
  try {
    const { updatedBy } = req.body; // Assume the user who updated the order is passed from the frontend

    // Update the order with all fields from the request body
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy },
      { new: true }
    );

    if (!updatedOrder)
      return res.status(404).json({ error: "Order not found" });
    res.status(200).json(updatedOrder);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update order", details: error.message });
  }
};

// Soft Delete Order
exports.deleteOrder = async (req, res) => {
  try {
    const { canceledBy, cancelReason } = req.body; // Assume the user who canceled the order and the reason are passed from the frontend

    // Soft delete the order by updating statusCode and adding cancellation details
    const deletedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { statusCode: 255, canceledBy, cancelReason },
      { new: true }
    );

    if (!deletedOrder)
      return res.status(404).json({ error: "Order not found" });
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to delete order", details: error.message });
  }
};

// Get financial summary (total amount, total product price, total income)
const Expense = require("../models/Expense"); // Import Expense model

// Get financial summary (total amount, total product price, total income, daily and monthly sales, expenses, and cash in hand)
exports.getFinancialSummary = async (req, res) => {
  try {
    const currentDate = new Date();

    // ** Daily Sales Summary **

    // Calculate daily sales (total bill) for orders with "Delivered" status and statusCode !== 255
    const dailySalesResult = await Order.aggregate([
      {
        $match: {
          status: "Delivered", // Status must be "Delivered"
          statusCode: { $ne: 255 }, // Exclude orders with statusCode 255
          deliveredDate: {
            $gte: new Date(currentDate.setHours(0, 0, 0, 0)), // Start of today
            $lt: new Date(currentDate.setHours(23, 59, 59, 999)), // End of today
          },
        },
      },
      {
        $group: {
          _id: null,
          dailySales: { $sum: "$grandTotal" }, // Sum of grandTotal for filtered orders
          totalOrders: { $sum: 1 }, // Count of total filtered orders
        },
      },
    ]);

    const dailySales =
      dailySalesResult.length > 0 ? dailySalesResult[0].dailySales : 0;
    const totalDailyOrders =
      dailySalesResult.length > 0 ? dailySalesResult[0].totalOrders : 0;

    // Calculate daily expense (from Expense collection) based on today's createdDate
    const dailyExpenseResult = await Expense.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentDate.setHours(0, 0, 0, 0)), // Start of today
            $lt: new Date(currentDate.setHours(23, 59, 59, 999)), // End of today
          },
        },
      },
      {
        $group: {
          _id: null,
          totalExpense: { $sum: "$totalCost" }, // Sum of expenses (totalCost)
          totalCashInHand: { $sum: "$cashInHand" }, // Sum of cashInHand
        },
      },
    ]);

    const dailyExpense =
      dailyExpenseResult.length > 0 ? dailyExpenseResult[0].totalExpense : 0;
    const dailyCashInHand =
      dailyExpenseResult.length > 0 ? dailyExpenseResult[0].totalCashInHand : 0;

    // ** Monthly Sales Summary **

    // Get the current month and year
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    ); // First day of the current month
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ); // Last day of the current month

    // Calculate monthly sales (total bill) for orders with "Delivered" status and statusCode !== 255
    const monthlySalesResult = await Order.aggregate([
      {
        $match: {
          status: "Delivered", // Status must be "Delivered"
          statusCode: { $ne: 255 }, // Exclude orders with statusCode 255
          deliveredDate: {
            $gte: startOfMonth, // Start of the current month
            $lt: endOfMonth, // End of the current month
          },
        },
      },
      {
        $group: {
          _id: null,
          monthlySales: { $sum: "$grandTotal" }, // Sum of grandTotal for filtered orders
          totalOrders: { $sum: 1 }, // Count of total filtered orders
        },
      },
    ]);

    const monthlySales =
      monthlySalesResult.length > 0 ? monthlySalesResult[0].monthlySales : 0;
    const totalMonthlyOrders =
      monthlySalesResult.length > 0 ? monthlySalesResult[0].totalOrders : 0;

    // Calculate monthly expense (from Expense collection) based on createdDate
    const monthlyExpenseResult = await Expense.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfMonth, // Start of the current month
            $lt: endOfMonth, // End of the current month
          },
        },
      },
      {
        $group: {
          _id: null,
          totalExpense: { $sum: "$totalCost" }, // Sum of expenses (totalCost)
          totalCashInHand: { $sum: "$cashInHand" }, // Sum of cashInHand
        },
      },
    ]);

    const monthlyExpense =
      monthlyExpenseResult.length > 0
        ? monthlyExpenseResult[0].totalExpense
        : 0;
    const monthlyCashInHand =
      monthlyExpenseResult.length > 0
        ? monthlyExpenseResult[0].totalCashInHand
        : 0;

    // Prepare response data with both daily and monthly summaries
    res.status(200).json({
      dailySales,
      totalDailyOrders,
      dailyExpense,
      dailyCashInHand,
      monthlySales,
      totalMonthlyOrders,
      monthlyExpense,
      monthlyCashInHand,
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    res.status(500).json({
      error: "Failed to fetch financial summary",
      details: error.message,
    });
  }
};
// Add to your existing API

// Helper function to get the start of the day (midnight)
const getStartOfDay = (date) => new Date(date.setHours(0, 0, 0, 0));

// Helper function to get the end of the day (11:59 PM)
const getEndOfDay = (date) => new Date(date.setHours(23, 59, 59, 999));

exports.getDailySummary = async (req, res) => {
  try {
    const currentDate = new Date();
    const last7Days = [...Array(7).keys()].map((i) => {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);
      return getStartOfDay(new Date(date));
    });

    // Initialize an array to store daily data
    const dailyData = [];

    // Loop through the last 7 days and collect sales, orders, and expenses
    for (const dayStart of last7Days) {
      const dayEnd = getEndOfDay(new Date(dayStart));

      // Fetch sales for the day
      const dailySalesResult = await Order.aggregate([
        {
          $match: {
            status: "Delivered", // or "Confirmed", based on your requirement
            createdAt: {
              $gte: dayStart,
              $lt: dayEnd,
            },
          },
        },
        {
          $group: {
            _id: null,
            dailySales: { $sum: "$totalBill" },
            totalOrders: { $sum: 1 },
          },
        },
      ]);

      // Fetch expenses for the day
      const dailyExpenseResult = await Expense.aggregate([
        {
          $match: {
            createdAt: {
              $gte: dayStart,
              $lt: dayEnd,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: "$totalCost" },
          },
        },
      ]);

      const dailySales =
        dailySalesResult.length > 0 ? dailySalesResult[0].dailySales : 0;
      const totalOrders =
        dailySalesResult.length > 0 ? dailySalesResult[0].totalOrders : 0;
      const dailyExpense =
        dailyExpenseResult.length > 0 ? dailyExpenseResult[0].totalExpense : 0;

      dailyData.push({
        date: dayStart,
        dailySales,
        totalOrders,
        dailyExpense,
      });
    }

    // Return the daily data for the last 7 days
    res.status(200).json(dailyData);
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({
      error: "Failed to fetch daily summary",
      details: error.message,
    });
  }
};
// upload product image on order time
// Function to compress images
const sharp = require("sharp");
async function compressImage(buffer) {
  try {
    return await sharp(buffer)
      .resize(800) // Resize to a maximum width of 800px
      .jpeg({ quality: 80 }) // Compress to 80% quality
      .toBuffer();
  } catch (error) {
    console.error("Error compressing image:", error);
    throw new Error("Failed to compress image");
  }
}
exports.uploadOrderImage = async (req, res) => {
  const { id } = req.params; // Order ID from the request parameters

  try {
    // Check if the order exists
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if an image file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    // Compress the uploaded image
    let imageBase64 = null;
    try {
      const compressedImageBuffer = await compressImage(req.file.buffer); // Compress the image
      imageBase64 = compressedImageBuffer.toString("base64"); // Convert to base64
    } catch (error) {
      console.error("Error compressing image:", error);
      return res.status(400).json({ error: "Failed to process image" });
    }

    // Update the order's imageUrl field with the compressed image
    order.imageUrl = imageBase64;
    await order.save();

    // Return success response
    res.status(200).json({
      message: "Order image uploaded and updated successfully",
      imageUrl: order.imageUrl,
    });
  } catch (error) {
    console.error("Error in uploadOrderImage:", error);
    res.status(500).json({ error: "Server error" });
  }
};
exports.uploadOrderNoteImage = async (req, res) => {
  console.log("Request body:", req.body); // Log the request body
  console.log("Request file:", req.file); // Log the uploaded file

  const { id } = req.params; // Order ID from the request parameters

  try {
    // Check if the order exists
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if an image file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    // Compress the uploaded image
    let imageBase64 = null;
    try {
      const compressedImageBuffer = await compressImage(req.file.buffer); // Compress the image
      imageBase64 = compressedImageBuffer.toString("base64"); // Convert to base64
    } catch (error) {
      console.error("Error compressing image:", error);
      return res.status(400).json({ error: "Failed to process image" });
    }

    // Update the order's noteImageUrl field with the compressed image
    order.noteImageUrl = imageBase64;
    await order.save();

    // Return success response
    res.status(200).json({
      message: "Order note image uploaded and updated successfully",
      noteImageUrl: order.noteImageUrl,
    });
  } catch (error) {
    console.error("Error in uploadOrderNoteImage:", error);
    res.status(500).json({ error: "Server error" });
  }
};
