const express = require("express");
const {
  register,
  login,
  getAllUsers,
  updateUser,
  updateStatusID,
  hardDeleteUser,
  updatePagePermissions,
  userImageUpload,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload"); // Import the upload middleware

const router = express.Router();

const multer = require("multer");

// Use the upload middleware for the register route
router.post("/register", upload.single("image"), register);
router.post("/login", login);

// Protected routes
router.get("/users", protect, getAllUsers); // Get all users
router.put("/users/:id", protect, updateUser); // Update user info

// Soft delete user (statusID=255)
router.put("/users/soft/:id", protect, updateStatusID);

// Hard delete user (remove from database)
router.delete("/users/hard/:id", protect, hardDeleteUser);

router.put("/:id/page-permissions", updatePagePermissions);

// New route for image upload
router.post("/image-upload/:id", upload.single("image"), userImageUpload);

module.exports = router;
