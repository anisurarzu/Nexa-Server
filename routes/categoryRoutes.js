// routes/categoryRoutes.js
const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

// Create a new category
router.post("/categories", categoryController.createCategory);

// Get all categories (excluding deleted ones)
router.get("/categories", categoryController.getCategories);

// Get category statistics
router.get("/getCategoryStats", categoryController.getCategoryStats);

// Get daily summary
router.get("/getDailySummary", categoryController.getDailySummary);

// Get a specific category by ID
router.get("/categories/:id", categoryController.getCategoryById);

// Get category information by categoryCode
router.get(
  "/getCategoryInfo/:categoryCode",
  categoryController.getCategoryInfoByCode
);

// Get multiple categories by type
router.get(
  "/getCategoriesByType/:categoryType",
  categoryController.getCategoriesByType
);

// Update a category by ID
router.put("/categories/:id", categoryController.updateCategory);

// Soft delete a category by ID
router.delete("/categories/:id", categoryController.deleteCategory);

// Bulk update categories status
router.patch("/bulk-update-status", categoryController.bulkUpdateStatus);

module.exports = router;
