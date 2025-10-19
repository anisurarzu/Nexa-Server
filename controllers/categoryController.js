// controllers/categoryController.js
const Category = require("../models/Category");

// Helper function to generate category code
const generateCategoryCode = async () => {
  try {
    const prefix = "CAT";
    const lastCategory = await Category.findOne().sort({ _id: -1 });
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
  } catch (error) {
    console.error("Error generating category code:", error);
    throw new Error("Could not generate category code");
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { createdBy, ...categoryData } = req.body;

    // Generate category code if not provided
    let categoryCode = categoryData.categoryCode;
    if (!categoryCode) {
      categoryCode = await generateCategoryCode();
    }

    // Check if category code already exists
    const existingCategory = await Category.findOne({ categoryCode });
    if (existingCategory) {
      return res.status(400).json({
        error: "Category code already exists",
      });
    }

    // Create new category
    const newCategory = new Category({
      ...categoryData,
      categoryCode: categoryCode.toUpperCase(),
      createdBy,
      statusCode: 0,
    });

    await newCategory.save();
    res.status(200).json(newCategory);
  } catch (error) {
    console.error("Error creating category:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: "Duplicate category code.",
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to create category",
      details: error.message,
    });
  }
};

// Get all categories (excluding deleted ones)
// Get all categories (excluding deleted ones)
exports.getCategories = async (req, res) => {
  const { status, categoryType, search } = req.query;

  try {
    // Build filter object
    const filter = { statusCode: { $ne: 255 } };

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Add category type filter if provided
    if (categoryType) {
      filter.categoryType = categoryType;
    }

    // Add search functionality
    if (search) {
      filter.$or = [
        { categoryName: { $regex: search, $options: "i" } },
        { categoryCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Use aggregation to get product count for each category
    const categories = await Category.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "products", // Product collection name
          localField: "categoryCode", // categoryCode in Category model
          foreignField: "category", // category field in Product model (assuming it stores categoryCode)
          as: "products",
        },
      },
      {
        $addFields: {
          productsCount: { $size: "$products" }, // Count the products
        },
      },
      {
        $project: {
          products: 0, // Remove the products array from response
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      error: "Failed to fetch categories",
      details: error.message,
    });
  }
};

// Get category statistics
// Get category statistics
exports.getCategoryStats = async (req, res) => {
  try {
    const stats = await Category.aggregate([
      {
        $match: { statusCode: { $ne: 255 } },
      },
      {
        $lookup: {
          from: "products", // Product collection name
          localField: "categoryCode", // categoryCode in Category model
          foreignField: "category", // category field in Product model
          as: "categoryProducts",
        },
      },
      {
        $project: {
          status: 1,
          productsCount: { $size: "$categoryProducts" }, // Count actual products
        },
      },
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          activeCategories: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          inactiveCategories: {
            $sum: { $cond: [{ $ne: ["$status", "active"] }, 1, 0] },
          },
          totalProducts: { $sum: "$productsCount" }, // Sum of actual product counts
        },
      },
    ]);

    const result =
      stats.length > 0
        ? stats[0]
        : {
            totalCategories: 0,
            activeCategories: 0,
            inactiveCategories: 0,
            totalProducts: 0,
          };

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching category stats:", error);
    res.status(500).json({
      error: "Failed to fetch category statistics",
      details: error.message,
    });
  }
};

// Get daily summary for categories (last 7 days)
exports.getDailySummary = async (req, res) => {
  try {
    const currentDate = new Date();
    const last7Days = [...Array(7).keys()].map((i) => {
      const date = new Date();
      date.setDate(currentDate.getDate() - i);
      return new Date(date.setHours(0, 0, 0, 0));
    });

    const dailyData = [];

    for (const dayStart of last7Days) {
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyStats = await Category.aggregate([
        {
          $match: {
            createdAt: {
              $gte: dayStart,
              $lt: dayEnd,
            },
            statusCode: { $ne: 255 },
          },
        },
        {
          $group: {
            _id: null,
            categoriesCreated: { $sum: 1 },
            totalProducts: { $sum: "$productsCount" },
          },
        },
      ]);

      dailyData.push({
        date: dayStart,
        categoriesCreated:
          dailyStats.length > 0 ? dailyStats[0].categoriesCreated : 0,
        totalProducts: dailyStats.length > 0 ? dailyStats[0].totalProducts : 0,
      });
    }

    res.status(200).json(dailyData);
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({
      error: "Failed to fetch daily summary",
      details: error.message,
    });
  }
};

// Get a specific category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      statusCode: { $ne: 255 },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch category",
      details: error.message,
    });
  }
};

// Get category information by categoryCode
exports.getCategoryInfoByCode = async (req, res) => {
  try {
    const category = await Category.findOne({
      categoryCode: req.params.categoryCode,
      statusCode: { $ne: 255 },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch category",
      details: error.message,
    });
  }
};

// Get multiple categories by type
exports.getCategoriesByType = async (req, res) => {
  const { categoryType } = req.params;

  try {
    const categories = await Category.find({
      categoryType: categoryType,
      statusCode: { $ne: 255 },
    });

    if (categories.length === 0) {
      return res.status(404).json({
        error: "No categories found for this type",
      });
    }

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch categories",
      details: error.message,
    });
  }
};

// Update a category by ID
exports.updateCategory = async (req, res) => {
  try {
    const { updatedBy, ...updateData } = req.body;

    // Check if category code is being updated and if it already exists
    if (updateData.categoryCode) {
      const existingCategory = await Category.findOne({
        categoryCode: updateData.categoryCode,
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        return res.status(400).json({
          error: "Category code already exists",
        });
      }

      updateData.categoryCode = updateData.categoryCode.toUpperCase();
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { ...updateData, updatedBy },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: "Duplicate category code",
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to update category",
      details: error.message,
    });
  }
};

// Soft delete a category by ID
exports.deleteCategory = async (req, res) => {
  try {
    const { deletedBy, deleteReason } = req.body;

    // Check if category exists and has no products
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (category.productsCount > 0) {
      return res.status(400).json({
        error: "Cannot delete category with existing products",
      });
    }

    // Soft delete by updating statusCode
    const deletedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      {
        statusCode: 255,
        deletedBy,
        deleteReason,
      },
      { new: true }
    );

    res.status(200).json({
      message: "Category deleted successfully",
      category: deletedCategory,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete category",
      details: error.message,
    });
  }
};

// Bulk update categories status
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { categoryIds, status, updatedBy } = req.body;

    if (!categoryIds || !categoryIds.length || !status) {
      return res.status(400).json({
        error: "Category IDs and status are required",
      });
    }

    const result = await Category.updateMany(
      { _id: { $in: categoryIds } },
      { status, updatedBy }
    );

    res.status(200).json({
      message: `${result.modifiedCount} categories updated successfully`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update categories",
      details: error.message,
    });
  }
};
