const User = require("../models/User");
const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const mongoose = require("mongoose");
dayjs.extend(utc);
require("dotenv").config();
const bcrypt = require("bcryptjs"); // For password hashing
const sharp = require("sharp"); // For image compression

// Function to generate unique loginID like FTB-{random4digits}
function generateLoginID() {
  const randomDigits = Math.floor(1000 + Math.random() * 9000); // Generates a random 4-digit number
  return `FTB-${randomDigits}`;
}

// Function to compress images
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

// Register a new user
const register = async (req, res) => {
  const {
    username,
    gender,
    email,
    password,
    plainPassword,
    phoneNumber,
    currentAddress,
    role,
    loginID,
  } = req.body;

  // Check for required fields
  const requiredFields = [
    "username",
    "gender",
    "email",
    "password",
    "phoneNumber",
    "currentAddress",
    "role",
    "loginID",
  ];

  const missingFields = requiredFields.filter((field) => !req.body[field]);
  if (missingFields.length) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  try {
    // Check if an image file was uploaded

    const roleInfo = {
      label: role.label,
      value: role.value,
    };

    // Create the new user with timestamps
    const user = await User.create({
      username,
      gender,
      email,
      password, // Will be hashed before saving
      plainPassword,
      phoneNumber,
      currentAddress,
      role: roleInfo,
      loginID,
    });

    // Send a confirmation message with created date, time, and userID
    res.status(200).json({
      message: "Registration successful. Please log in to continue.",
      createdAt: user.createdAt,
      userID: user._id, // Return the userID
    });
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error
      const duplicateFields = Object.keys(error.keyValue).join(", ");
      return res
        .status(400)
        .json({ error: `Duplicate fields found: ${duplicateFields}` });
    }
    res.status(400).json({ error: error.message });
  }
};

const userImageUpload = async (req, res) => {
  const { id } = req.params; // User ID from the request parameters

  try {
    // Check if the user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if an image file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    // Compress the uploaded image
    let imageBase64 = null;
    try {
      const compressedImageBuffer = await compressImage(req.file.buffer);
      imageBase64 = compressedImageBuffer.toString("base64");
    } catch (error) {
      return res.status(400).json({ error: "Failed to process image" });
    }

    // Update the user's imageUrl field
    user.imageUrl = imageBase64;
    await user.save();

    // Return success response
    res.status(200).json({
      message: "User image uploaded and updated successfully",
      imageUrl: user.imageUrl,
    });
  } catch (error) {
    console.error("Error in userImageUpload:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Login a user
const login = async (req, res) => {
  const { loginID, password, latitude, longitude, publicIP, loginTime } =
    req.body;

  try {
    // Find the user by loginID
    const user = await User.findOne({ loginID });

    if (!user) {
      return res
        .status(400)
        .json({ error: "User with this loginID does not exist" });
    }

    // Check if the password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    // If login is successful, generate a JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "10h",
    });

    // Store login details in loginHistory
    const loginData = {
      latitude: latitude || "0.0", // Default if not provided
      longitude: longitude || "0.0",
      publicIP: publicIP || "Unknown",
      loginTime: loginTime,
    };

    user.loginHistory.push(loginData);
    await user.save(); // Save updated user document

    // Return the token and user details
    res.status(200).json({
      token,
      user: {
        id: user._id,
        loginID: user.loginID,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        currentAddress: user.currentAddress,
        role: user.role,
        imageUrl: user.imageUrl, // Return the Base64 image
        hotelID: user.hotelID,
        pagePermissions: user.pagePermissions,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    // Fetch users sorted by creation date (newest first)
    const users = await User.find({ statusID: { $ne: 255 } }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      users: users.map((user) => ({
        id: user._id,
        loginID: user.loginID,
        gender: user.gender,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        nid: user.nid,
        currentAddress: user.currentAddress,
        role: user.role,
        imageUrl: user.imageUrl,
        pagePermissions: user.pagePermissions,
        createdAt: user.createdAt, // Include createdAt in the response
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Update user information
const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    imageUrl,
    username,
    gender,
    email,
    phoneNumber,
    nid,
    currentAddress,
    loginID,
    role,
    password, // Add newPassword to handle password change
  } = req.body;

  try {
    // If the new password is provided, hash it
    let updatedFields = {
      imageUrl,
      username,
      gender,
      email,
      phoneNumber,
      nid,
      loginID,
      currentAddress,
      role: {
        label: role.label,
        value: role.value,
      },
    };

    // Only hash the password if a new one is provided
    if (password) {
      const salt = await bcrypt.genSalt(10); // Generate salt
      const hashedPassword = await bcrypt.hash(password, salt); // Hash the new password
      updatedFields.password = hashedPassword; // Add hashed password to fields to be updated
    }

    // Perform the update
    const updatedUser = await User.findByIdAndUpdate(id, updatedFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      user: {
        id: updatedUser._id,
        loginID: updatedUser.loginID,
        username: updatedUser.username,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        nid: updatedUser.nid,
        currentAddress: updatedUser.currentAddress,
        role: updatedUser.role,
        imageUrl: updatedUser.imageUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Soft delete user (mark as deleted with statusID=255)
const updateStatusID = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { statusID: 255 },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "User status updated to 255.",
      updatedUser: user,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Hard delete user (completely remove user)
const hardDeleteUser = async (req, res) => {
  const { id } = req.params;
  const { deletedBy } = req.body; // The user who performs the delete action

  try {
    // Validate MongoDB ObjectID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID format." });
    }

    // Find the user by ID
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Track deletion information
    const deletionInfo = {
      deletedBy, // Track who deleted the user
      deletedAt: new Date(), // Track when the deletion occurred
    };

    // Perform hard delete using findByIdAndDelete
    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: "User permanently deleted.",
      ...deletionInfo,
    });
  } catch (error) {
    console.error("Error in hardDeleteUser:", error);
    res.status(500).json({ error: "Server error." });
  }
};

// Update user page permissions
const updatePagePermissions = async (req, res) => {
  const { id } = req.params;
  const { userName, userLoginId, pages } = req.body;

  try {
    // Find the user by ID
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("hit", pages);

    // Update the user's page permissions
    user.pagePermissions = pages.map(
      ({
        pageId,
        viewAccess,
        editAccess,
        statusUpdateAccess,
        insertAccess,
      }) => ({
        pageId,
        viewAccess,
        editAccess,
        statusUpdateAccess,
        insertAccess,
      })
    );

    // Save the updated user
    await user.save();

    // Return success response
    res.status(200).json({ message: "Permissions updated successfully!" });
  } catch (error) {
    console.error("Error updating permissions:", error);
    res.status(500).json({ error: "Error updating permissions." });
  }
};

module.exports = {
  register,
  login,
  getAllUsers,
  updateUser,
  updateStatusID,
  hardDeleteUser,
  updatePagePermissions,
  userImageUpload,
};
