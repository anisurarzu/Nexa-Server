const Product = require("../models/Product");
const sharp = require("sharp");

// Function to generate a new product ID based on the current year and serial number
async function generateProductId() {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const lastProduct = await Product.findOne({
    productId: { $regex: `^PRODUCT${currentYear}` },
  })
    .sort({ productId: -1 })
    .limit(1);

  let serialNumber = 1;
  if (lastProduct) {
    const lastSerialNumber = parseInt(lastProduct.productId.slice(-2), 10);
    serialNumber = lastSerialNumber + 1;
  }

  const formattedSerialNumber = serialNumber.toString().padStart(2, "0");
  return `PRODUCT${currentYear}${formattedSerialNumber}`;
}

// Create a Product
exports.createProduct = async (req, res) => {
  try {
    const productId = await generateProductId();
    const product = new Product({
      productId: productId,
      ...req.body,
    });
    await product.save();
    res.status(200).json({
      success: true,
      message: "Product created",
      productId: product.productId,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get All Products (Latest First)
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Products for Dropdown
exports.getProductDropdown = async (req, res) => {
  try {
    const products = await Product.find(
      { stockQTY: { $gt: 0 } },
      "productId productName imageUrl stockQTY"
    ).sort({ name: 1 });

    res.status(200).json({
      success: true,
      products: products.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        imageUrl: product.imageUrl,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const updatedProduct = await Product.findOneAndUpdate(
      { productId: req.params.id },
      req.body,
      { new: true }
    );
    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Product updated", updatedProduct });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findOneAndDelete({
      productId: req.params.id,
    });
    if (!deletedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function to compress images
async function compressImage(buffer) {
  try {
    return await sharp(buffer).resize(800).jpeg({ quality: 80 }).toBuffer();
  } catch (error) {
    console.error("Error compressing image:", error);
    throw new Error("Failed to compress image");
  }
}

// Upload Image for Product
exports.uploadProductImage = async (req, res) => {
  const { id } = req.params;

  try {
    console.log("Looking for product with ID:", id);

    // Check if the product exists using productId
    const product = await Product.findOne({ productId: id });
    console.log("Product found:", product);

    if (!product) {
      console.log("Product not found with ID:", id);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if an image file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    console.log("File received:", req.file);

    // Compress the uploaded image
    let imageBase64 = null;
    try {
      const compressedImageBuffer = await compressImage(req.file.buffer);
      imageBase64 = compressedImageBuffer.toString("base64");
    } catch (error) {
      console.error("Error compressing image:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to process image",
      });
    }

    // Update the product's imageUrl field
    product.imageUrl = imageBase64;
    await product.save();

    console.log("Image uploaded successfully for product:", id);

    // Return success response
    res.status(200).json({
      success: true,
      message: "Product image uploaded and updated successfully",
      imageUrl: product.imageUrl,
    });
  } catch (error) {
    console.error("Error in uploadProductImage:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};
