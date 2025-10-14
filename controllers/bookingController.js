const Booking = require("../models/Booking");

// Helper function to generate a serial number for today's bookings
const generateSerialNo = async () => {
  try {
    // Find the last booking by insertion order (using `_id` in descending order)
    const lastBooking = await Booking.findOne().sort({ _id: -1 });

    // Increment serial number based on the last serialNo, or start at 1 if no previous booking exists
    const newSerialNo = lastBooking ? lastBooking.serialNo + 1 : 1;

    return newSerialNo;
  } catch (error) {
    console.error("Error generating serial number:", error);
    throw new Error("Could not generate serial number");
  }
};

const generateBookingNo = async () => {
  const currentDate = new Date();

  // Get current year, month, and day
  const year = currentDate.getFullYear().toString().slice(-2); // Last two digits of the year
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0"); // Month, zero-padded
  const day = currentDate.getDate().toString().padStart(2, "0"); // Day, zero-padded

  // Generate the prefix for the booking number
  const datePrefix = `${year}${month}${day}`;

  // Fetch all booking numbers that match the current date prefix
  const bookings = await Booking.find(
    { bookingNo: { $regex: `^${datePrefix}` } }, // Match bookings with the same date prefix
    { bookingNo: 1 }
  );

  // Determine the maximum serial number for today's bookings
  let maxSerialNo = 0;
  bookings.forEach((booking) => {
    if (booking.bookingNo) {
      // Extract the serial number from the bookingNo
      const serialNo = parseInt(booking.bookingNo.slice(-2), 10); // Last 2 digits for serial
      if (serialNo > maxSerialNo) {
        maxSerialNo = serialNo;
      }
    }
  });

  // Increment the maximum serial number to generate the new booking number
  const newSerialNo = (maxSerialNo + 1).toString().padStart(2, "0"); // Zero-padded
  const newBookingNo = `${datePrefix}${newSerialNo}`;

  return newBookingNo;
};

// @desc Create a new booking
// @route POST /api/bookings
const createBooking = async (req, res) => {
  const bookingData = req.body;

  try {
    let bookingNo;
    const serialNo = await generateSerialNo();

    // Check if the reference exists (i.e., the booking is associated with an existing bookingNo)
    if (bookingData.reference) {
      const referenceBooking = await Booking.findOne({
        bookingNo: bookingData.reference,
      });

      if (referenceBooking) {
        // Use the existing bookingNo from the reference
        bookingNo = referenceBooking.bookingNo;
      } else {
        // If the reference bookingNo does not exist, generate a new booking number
        bookingNo = await generateBookingNo();
      }
    } else {
      // Generate a new booking number if no reference is provided
      bookingNo = await generateBookingNo();
    }

    // Create the new booking with either the referenced or new bookingNo
    const booking = await Booking.create({
      ...bookingData,
      bookingNo,
      serialNo,
    });

    res.status(200).json({ message: "Booking created successfully", booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc Update an existing booking
// @route PUT /api/bookings/:id
const updateBooking = async (req, res) => {
  const { id } = req.params;
  const bookingData = req.body;

  try {
    const booking = await Booking.findByIdAndUpdate(id, bookingData, {
      new: true,
    });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(200).json({ message: "Booking updated successfully", booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc Get all bookings
// @route GET /api/bookings
const getBookings = async (req, res) => {
  try {
    // const bookings = await Booking.find({ statusID: { $ne: 255 } }).sort({
    //   createdAt: -1,
    // });
    // Fetch and sort bookings
    const bookings = await Booking.find().sort({ createdAt: -1 });

    // Respond with bookings array
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// @desc Get bookings by hotelID
// @route GET /api/bookings/hotel/:hotelID
// @desc Get bookings by hotelID (string version)
// @route GET /api/bookings/hotel/:hotelID
// @desc Get bookings by hotelID
// @route GET /api/bookings/hotel/:hotelID
const getBookingsByHotelId = async (req, res) => {
  const { hotelID } = req.body; // Extract hotelID from the body instead of params

  try {
    // Convert hotelID from string to number, since hotelID is a number in your schema
    const numericHotelID = Number(hotelID);

    // Check if the conversion was successful (not NaN)
    if (isNaN(numericHotelID)) {
      return res
        .status(400)
        .json({ error: "Invalid hotelID. Must be a number." });
    }

    // Find all bookings associated with the given hotelID and sort by creation date (latest first)
    const bookings = await Booking.find({ hotelID: numericHotelID }).sort({
      createdAt: -1,
    });

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ error: "No bookings found for this hotel ID" });
    }

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Get multiple bookings by bookingNo
const getBookingsByBookingNo = async (req, res) => {
  const { bookingNo } = req.params;

  try {
    // Find all bookings that have the same bookingNo
    const bookings = await Booking.find({ bookingNo: bookingNo });

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ error: "No bookings found for this booking number" });
    }

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Get a single booking
// @route GET /api/bookings/:id
const getBookingById = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* -------------- soft delete----- */

const updateStatusID = async (req, res) => {
  const { id } = req.params;
  const { canceledBy, reason } = req.body; // Get both canceledBy and reason from the request body

  try {
    // Use runValidators to enforce schema validation on updates
    const booking = await Booking.findByIdAndUpdate(
      id,
      {
        statusID: 255,
        canceledBy, // Update the canceledBy field
        reason, // Update the reason field as well
      },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json({
      message: "Booking status updated to 255, canceledBy and reason updated.",
      updatedBooking: booking, // Optionally include the updated booking object for debugging
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// @desc Delete a booking
// @route DELETE /api/bookings/:id
const deleteBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findByIdAndDelete(id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createBooking,
  updateBooking,
  getBookings,
  getBookingsByHotelId,
  getBookingById,
  deleteBooking,
  getBookingsByBookingNo,
  updateStatusID,
};
