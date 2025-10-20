const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const upload = require("../middleware/upload"); // Import the upload middleware

// Create a new product
router.post("/products", productController.createProduct);

// Get all products (excluding deleted ones)
router.get("/products", productController.getProducts);
router.get("/productsDropdown", productController.getProductDropdown);

// Get products by category ID
router.get(
  "/products/category/:categoryCode",
  productController.getProductsByCategory
);

// Get a specific product by ID
router.get("/products/:id", productController.getProductById);

// New route for image upload
router.post(
  "/image-upload/:id",
  upload.single("image"),
  productController.uploadProductImage
);

// Update a product by ID
router.put("/products/:id", productController.updateProduct);

// Soft delete a product by ID
router.delete("/products/:id", productController.deleteProduct);

module.exports = router;
