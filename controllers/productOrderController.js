const mongoose = require("mongoose");
const ProductOrder = require("../models/ProductOrder");
const Product = require("../models/Product");

/**
 * Generate auto order number in format YYMMNNN
 */
const generateOrderNumber = async () => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const latestOrder = await ProductOrder.findOne({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .sort({ createdAt: -1 })
      .select("orderNo");

    let sequence = 1;
    if (latestOrder?.orderNo) {
      const lastSeq = parseInt(latestOrder.orderNo.slice(-3));
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    const sequenceStr = sequence.toString().padStart(3, "0");
    return `${year}${month}${sequenceStr}`;
  } catch (error) {
    console.error("Error generating order number:", error);
    return `${new Date().getFullYear().toString().slice(-2)}${(
      new Date().getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}${Date.now().toString().slice(-3)}`;
  }
};

/**
 * Update product quantity (deduct or restore)
 */
const updateProductQuantity = async (
  productId,
  orderQty,
  operation = "deduct"
) => {
  try {
    // Ensure orderQty is a number
    const qtyToChange = parseInt(orderQty, 10);
    if (isNaN(qtyToChange) || qtyToChange <= 0) {
      throw new Error(`অবৈধ অর্ডার পরিমাণ: ${orderQty}`);
    }

    const product = await Product.findOne({ productId });
    if (!product) throw new Error(`পণ্য পাওয়া যায়নি: ${productId}`);

    // Convert current quantities to numbers
    let currentQty = parseInt(product.qty, 10) || 0;

    if (operation === "deduct") {
      if (currentQty < qtyToChange) {
        throw new Error(
          `স্টক পর্যাপ্ত নয়। পাওয়া যায়: ${currentQty}, চাওয়া হয়েছে: ${qtyToChange}`
        );
      }
      currentQty -= qtyToChange;
    } else if (operation === "restore") {
      currentQty += qtyToChange;
    }

    // Update both qty and stockQTY
    product.qty = currentQty;
    product.stockQTY = currentQty;

    await product.save();
    return product;
  } catch (error) {
    console.error("Error updating product quantity:", error);
    throw error;
  }
};

/**
 * Create new order
 */
const createOrder = async (req, res) => {
  try {
    const {
      productId,
      productName,
      orderDate,
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
      paidAmount,
      dueAmount,
      createdBy,
      status,
    } = req.body;

    if (!productId || !productName || !salePrice || !quantity) {
      return res.status(400).json({
        success: false,
        message:
          "সমস্ত প্রয়োজনীয় তথ্য প্রদান করুন (Product ID, নাম, মূল্য, পরিমাণ)!",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "অর্ডার পরিমাণ ০ বা তার চেয়ে কম হতে পারে না!",
      });
    }

    // Deduct stock
    let updatedProduct;
    try {
      updatedProduct = await updateProductQuantity(
        productId,
        quantity,
        "deduct"
      );
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const orderNo = await generateOrderNumber();
    const calculatedTotal = (salePrice || 0) * (quantity || 0);

    const orderData = {
      orderNo,
      orderDate,
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
      totalAmount: totalAmount || calculatedTotal,
      grandTotal: grandTotal || calculatedTotal,
      paymentMethod: paymentMethod || "Cash",
      paidAmount: paidAmount || 0,
      dueAmount: dueAmount || 0,
      createdBy: createdBy || "user",
      status: status || "Pending",
      originalStock: updatedProduct.qty + quantity,
      remainingStock: updatedProduct.qty,
    };

    const newOrder = new ProductOrder(orderData);
    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: "অর্ডার সফলভাবে তৈরি হয়েছে এবং পণ্যের স্টক আপডেট করা হয়েছে!",
      data: savedOrder,
      productStock: {
        before: orderData.originalStock,
        after: orderData.remainingStock,
        deducted: quantity,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "অর্ডার তৈরি করতে সমস্যা হয়েছে!",
      error: error.message,
    });
  }
};

/**
 * Update order
 */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      quantity: newQty, 
      status: newStatus, 
      salePrice,
      paidAmount,
      paymentMethod,
      updatedBy,
      ...updates 
    } = req.body;

    const order = await ProductOrder.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "অর্ডার পাওয়া যায়নি!" });
    }

    let stockChange = null;

    // Handle quantity change
    if (newQty !== undefined && newQty !== order.quantity) {
      const diff = newQty - order.quantity;

      if (diff > 0) {
        // Need more items - deduct additional stock
        await updateProductQuantity(order.productId, diff, "deduct");
        stockChange = `Deducted ${diff} extra units`;
      } else if (diff < 0) {
        // Need fewer items - restore stock
        await updateProductQuantity(order.productId, Math.abs(diff), "restore");
        stockChange = `Restored ${Math.abs(diff)} units`;
      }

      order.quantity = newQty;
      // Recalculate totals
      const newTotal = (salePrice || order.salePrice) * newQty;
      order.total = newTotal;
      order.totalAmount = newTotal;
      order.grandTotal = newTotal;
    }

    // Handle sale price change
    if (salePrice !== undefined && salePrice !== order.salePrice) {
      order.salePrice = salePrice;
      // Recalculate totals
      const newTotal = salePrice * (newQty || order.quantity);
      order.total = newTotal;
      order.totalAmount = newTotal;
      order.grandTotal = newTotal;
    }

    // Handle payment method and amounts
    if (paymentMethod !== undefined) {
      order.paymentMethod = paymentMethod;
    }

    if (paidAmount !== undefined) {
      order.paidAmount = paidAmount;
    }

    // Recalculate due amount based on new values
    if (order.paymentMethod === "Cash" || 
        order.paymentMethod === "Card" || 
        order.paymentMethod === "Digital" ||
        order.paymentMethod === "Mobile Banking" ||
        order.paymentMethod === "Bank Transfer") {
      // Full payment methods
      order.paidAmount = order.grandTotal;
      order.dueAmount = 0;
    } else if (order.paymentMethod === "Due") {
      // Due payment
      order.paidAmount = 0;
      order.dueAmount = order.grandTotal;
    } else if (order.paymentMethod === "Partial") {
      // Partial payment
      order.paidAmount = order.paidAmount || 0;
      order.dueAmount = Math.max(0, order.grandTotal - order.paidAmount);
      
      // Ensure paidAmount doesn't exceed grandTotal
      if (order.paidAmount > order.grandTotal) {
        order.paidAmount = order.grandTotal;
        order.dueAmount = 0;
      }
    }

    // Handle status change
    if (newStatus && newStatus !== order.status) {
      if (newStatus === "Cancelled" && order.status !== "Cancelled") {
        // Order is being cancelled - restore stock
        await updateProductQuantity(order.productId, order.quantity, "restore");
        stockChange = `Restored ${order.quantity} units due to cancellation`;
      } else if (order.status === "Cancelled" && newStatus !== "Cancelled") {
        // Order is being reactivated - deduct stock again
        await updateProductQuantity(order.productId, order.quantity, "deduct");
        stockChange = `Deducted ${order.quantity} units (reactivated order)`;
      }
      order.status = newStatus;
    }

    // Update updatedBy field
    if (updatedBy) {
      order.updatedBy = updatedBy;
    }

    // Update other fields
    Object.assign(order, updates);
    const updatedOrder = await order.save();

    res.json({
      success: true,
      message: "অর্ডার সফলভাবে আপডেট হয়েছে!",
      data: updatedOrder,
      stockChange,
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
 * Delete order
 */
const deleteOrder = async (req, res) => {
  try {
    const order = await ProductOrder.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "অর্ডার পাওয়া যায়নি!" });
    }

    // Restore stock only if order wasn't cancelled
    if (order.status !== "Cancelled") {
      await updateProductQuantity(order.productId, order.quantity, "restore");
    }

    await ProductOrder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message:
        "অর্ডার সফলভাবে ডিলিট হয়েছে এবং পণ্যের স্টক পুনরুদ্ধার করা হয়েছে!",
      restored: order.status !== "Cancelled" ? order.quantity : 0,
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
 * Get all orders (with pagination & search)
 */
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { orderNo: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
      ];
    }

    const orders = await ProductOrder.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

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
 * Get order by ID
 */
const getOrderById = async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const order = await ProductOrder.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "অর্ডার পাওয়া যায়নি!" });

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
 * Get financial summary
 */
const getFinancialSummary = async (req, res) => {
  try {
    const orders = await ProductOrder.find({});
    
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.grandTotal || 0), 0);
    const totalPaid = orders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
    const totalDue = orders.reduce((sum, order) => sum + (order.dueAmount || 0), 0);
    
    const completedOrders = orders.filter(order => order.status === 'Completed').length;
    const pendingOrders = orders.filter(order => order.status === 'Pending').length;
    const processingOrders = orders.filter(order => order.status === 'Processing').length;
    
    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        totalPaid,
        totalDue,
        completedOrders,
        pendingOrders,
        processingOrders,
        paymentDistribution: {
          cash: orders.filter(order => order.paymentMethod === 'Cash').length,
          card: orders.filter(order => order.paymentMethod === 'Card').length,
          digital: orders.filter(order => order.paymentMethod === 'Digital').length,
          mobileBanking: orders.filter(order => order.paymentMethod === 'Mobile Banking').length,
          bankTransfer: orders.filter(order => order.paymentMethod === 'Bank Transfer').length,
          due: orders.filter(order => order.paymentMethod === 'Due').length,
          partial: orders.filter(order => order.paymentMethod === 'Partial').length,
        }
      }
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    res.status(500).json({
      success: false,
      message: "ফাইন্যান্সিয়াল সামারি লোড করতে সমস্যা হয়েছে!",
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  updateOrder,
  deleteOrder,
  getAllOrders,
  getOrderById,
  getFinancialSummary,
};