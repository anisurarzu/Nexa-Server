const ProductOrder = require("../models/ProductOrder");

/**
 * Generate auto order number in format YYMMNNN
 */
const generateOrderNumber = async () => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, "0"); // 01–12

    // Get latest order for this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const latestOrder = await ProductOrder.findOne({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ createdAt: -1 });

    let sequence = 1;
    if (latestOrder?.orderNo) {
      const lastSeq = parseInt(latestOrder.orderNo.slice(-3));
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    const sequenceStr = sequence.toString().padStart(3, "0");
    return `${year}${month}${sequenceStr}`;
  } catch (error) {
    console.error("Error generating order number:", error);
    // Fallback unique order number
    return `${new Date().getFullYear().toString().slice(-2)}${(
      new Date().getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}${Date.now().toString().slice(-3)}`;
  }
};

/**
 * ✅ Create new order (Single Product)
 */
const createOrder = async (req, res) => {
  try {
    const {
      productId,
      productName,
      category,
      unitPrice,
      salePrice,
      quantity,
      total,
      customerName,
      customerPhone,
      customerAddress,
      totalAmount,
      grandTotal,
      paymentMethod,
      createdBy,
      status,
    } = req.body;

    // Validate required fields
    if (!productId || !productName || !salePrice || !quantity) {
      return res.status(400).json({
        success: false,
        message:
          "সমস্ত প্রয়োজনীয় তথ্য প্রদান করুন (Product ID, নাম, মূল্য, পরিমাণ)!",
      });
    }

    const orderNo = await generateOrderNumber();

    const calculatedTotal = (salePrice || 0) * (quantity || 0);
    const finalTotal = grandTotal || calculatedTotal;
    const finalAmount = totalAmount || calculatedTotal;

    const orderData = {
      orderNo,
      productId,
      productName,
      category,
      unitPrice,
      salePrice,
      quantity,
      total: total || calculatedTotal,

      customerName: customerName || "Walk-in Customer",
      customerPhone: customerPhone || "N/A",
      customerAddress: customerAddress || "N/A",

      totalAmount: finalAmount,
      grandTotal: finalTotal,
      paymentMethod: paymentMethod || "Cash",
      createdBy: createdBy || "user",
      status: status || "Pending",
    };

    const newOrder = new ProductOrder(orderData);
    const savedOrder = await newOrder.save();

    return res.status(201).json({
      success: true,
      message: "অর্ডার সফলভাবে তৈরি হয়েছে!",
      data: savedOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);

    if (error.code === 11000 && error.keyPattern?.orderNo) {
      return res.status(400).json({
        success: false,
        message: "অর্ডার নম্বর ডুপ্লিকেট হয়েছে, আবার চেষ্টা করুন!",
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "ডেটা ভ্যালিডেশন ব্যর্থ হয়েছে!",
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "অর্ডার তৈরি করতে সমস্যা হয়েছে!",
      error: error.message,
    });
  }
};

/**
 * ✅ Get all orders (with filter, pagination, and search)
 */
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const query = {};

    if (status && status !== "all") query.status = status;

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { orderNo: { $regex: search, $options: "i" } },
      ];
    }

    const orders = await ProductOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await ProductOrder.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "অর্ডার লোড করতে সমস্যা হয়েছে!",
      error: error.message,
    });
  }
};

/**
 * ✅ Get order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const order = await ProductOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "অর্ডার পাওয়া যায়নি!",
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "অর্ডার লোড করতে সমস্যা হয়েছে!",
      error: error.message,
    });
  }
};

/**
 * ✅ Update order
 */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await ProductOrder.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "অর্ডার পাওয়া যায়নি!",
      });
    }

    res.json({
      success: true,
      message: "অর্ডার সফলভাবে আপডেট হয়েছে!",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "অর্ডার আপডেট করতে সমস্যা হয়েছে!",
      error: error.message,
    });
  }
};

/**
 * ✅ Delete order
 */
const deleteOrder = async (req, res) => {
  try {
    const deleted = await ProductOrder.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "অর্ডার পাওয়া যায়নি!",
      });
    }

    res.json({
      success: true,
      message: "অর্ডার সফলভাবে ডিলিট হয়েছে!",
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: "অর্ডার ডিলিট করতে সমস্যা হয়েছে!",
      error: error.message,
    });
  }
};

/**
 * ✅ Get financial summary
 */
const getFinancialSummary = async (req, res) => {
  try {
    const summary = await ProductOrder.getFinancialSummary(); // assumed static method in model
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    res.status(500).json({
      success: false,
      message: "ফাইন্যান্সিয়াল সামারি লোড করতে সমস্যা হয়েছে!",
      error: error.message,
    });
  }
};

/**
 * ✅ Get daily summary for charts
 */
const getDailySummary = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const dateRanges = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));

      dateRanges.push({ date: start, start, end });
    }

    const dailyData = await Promise.all(
      dateRanges.map(async (day) => {
        const dayOrders = await ProductOrder.find({
          createdAt: { $gte: day.start, $lte: day.end },
          status: { $ne: "Cancelled" },
        });

        const dailySales = dayOrders.reduce(
          (sum, o) => sum + (o.grandTotal || 0),
          0
        );
        const totalOrders = dayOrders.length;
        const dailyExpense = dailySales * 0.1; // Example: 10% expense

        return {
          date: day.date.toISOString().split("T")[0],
          dailySales,
          totalOrders,
          dailyExpense,
        };
      })
    );

    res.json({ success: true, data: dailyData });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({
      success: false,
      message: "ডেইলি সামারি লোড করতে সমস্যা হয়েছে!",
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getFinancialSummary,
  getDailySummary,
};
