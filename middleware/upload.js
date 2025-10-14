const multer = require("multer");

// Configure multer to store files in memory (as buffers)
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory
  limits: {
    fileSize: 50 * 1024 * 1024, // Limit file size to 50MB
  },
});

module.exports = upload;
