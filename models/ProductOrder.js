const mongoose = require("mongoose");

const productOrderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      unique: true,
      required: true,
    },
    customerName: {
      type: String,
      default: "Walk-in Customer",
    },
    customerPhone: {
      type: String,
      default: "N/A",
    },
    customerAddress: {
      type: String,
      default: "N/A",
    },

    // Product info (single product)
    productName: {
      type: String,
      required: true,
    },
    salePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      default: "pcs",
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // Financials
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      default: "Cash",
      enum: ["Cash", "Card", "Digital"],
    },

    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Completed", "Cancelled"],
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: String,
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// --------------------------------
// Auto-generate Order Number
// --------------------------------
productOrderSchema.pre("save", async function (next) {
  if (this.isNew) {
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, "");

    const lastOrder = await this.constructor
      .findOne({ orderNo: new RegExp(`^ORD${dateString}`) })
      .sort({ orderNo: -1 })
      .select("orderNo");

    let sequence = 1;
    if (lastOrder && lastOrder.orderNo) {
      const lastSeq = parseInt(lastOrder.orderNo.slice(-3));
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    this.orderNo = `ORD${dateString}${sequence.toString().padStart(3, "0")}`;
  }
  next();
});

// --------------------------------
// Financial Summary (Daily/Monthly)
// --------------------------------
productOrderSchema.statics.getFinancialSummary = async function () {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const [dailySummary, monthlySummary] = await Promise.all([
    this.aggregate([
      {
        $match: {
          orderDate: { $gte: startOfDay, $lte: endOfDay },
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$grandTotal" },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
    this.aggregate([
      {
        $match: {
          orderDate: { $gte: startOfMonth, $lte: endOfMonth },
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$grandTotal" },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Last 7 days chart
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));

    const dayOrders = await this.find({
      orderDate: { $gte: start, $lte: end },
      status: { $ne: "Cancelled" },
    });

    const dailySales = dayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalOrders = dayOrders.length;

    last7Days.push({
      date: start.toISOString().split("T")[0],
      dailySales,
      totalOrders,
    });
  }

  return {
    daily: {
      sales: dailySummary[0]?.totalSales || 0,
      orders: dailySummary[0]?.totalOrders || 0,
    },
    monthly: {
      sales: monthlySummary[0]?.totalSales || 0,
      orders: monthlySummary[0]?.totalOrders || 0,
    },
    chartData: last7Days,
  };
};

module.exports = mongoose.model("ProductOrder", productOrderSchema);
