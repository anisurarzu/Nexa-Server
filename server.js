const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const hotelCategoryRoutes = require("./routes/hotelCategoryRoutes"); // Import slider routes
const roomRoutes = require("./routes/roomRoutes"); // Import slider routes
const hotelRoutes = require("./routes/hotelRoutes"); // Import hotel routes
const bookingRoutes = require("./routes/bookingRoutes"); // Import booking routes
const orderRoutes = require("./routes/orderRoutes");
const productRoutes = require("./routes/productRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
require("dotenv").config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Auth Routes

app.use("/api/auth", authRoutes);

// Slider Routes
app.use("/api", hotelCategoryRoutes); // Add slider routes under /api

// Room Routes
app.use("/api", roomRoutes); // Add slider routes under /api

// Portfolio Routes
app.use("/api", hotelRoutes); // Add slider routes under /api

//Booking Routes
app.use("/api", bookingRoutes);

//Order Routes
app.use("/api", orderRoutes);

//Product Routes
app.use("/api", productRoutes);

//Expense Routes
app.use("/api", expenseRoutes);

app.use("/api", categoryRoutes);
// Root Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
