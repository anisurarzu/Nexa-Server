const Hotel = require("../models/Hotel");
const mongoose = require("mongoose"); // Ensure mongoose is imported
const { ObjectId } = require("mongoose").Types;

// Function to get the next sequential hotelID
const getNextHotelID = async () => {
  const lastHotel = await Hotel.findOne().sort({ hotelID: -1 });
  return lastHotel ? lastHotel.hotelID + 1 : 0; // If no category found, start from 0
};

// @desc Create a new hotel category
// @route POST /api/categories
const createHotel = async (req, res) => {
  const { hotelName, hotelDescription, roomCategories } = req.body;

  try {
    // Get the next hotelID
    const hotelID = await getNextHotelID();

    // Create the new category with createTime and hotelID
    const hotel = await Hotel.create({
      hotelID,
      hotelName,
      hotelDescription,
      roomCategories,
      createTime: new Date(), // Set the current time as createTime
    });

    res.status(200).json(hotel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc Get all categories
// @route GET /api/categories
const getHotel = async (req, res) => {
  try {
    const hotel = await Hotel.find();
    res.status(200).json(hotel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Update a category
// @route PUT /api/categories/:id
const updateHotel = async (req, res) => {
  const { id } = req.params;

  try {
    const hotel = await Hotel.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!hotel) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(200).json(hotel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBooking = async (req, res) => {
  // Extract hotelID, categoryName, roomName, and booking from req.body
  const { hotelID, categoryName, roomName, booking } = req.body;

  try {
    // Log the parameters to verify the values being passed
    console.log("hotelID:", hotelID);
    console.log("categoryName:", categoryName);
    console.log("roomName:", roomName);
    console.log("booking:", booking);

    // Find the hotel by hotelID
    const hotel = await Hotel.findOne({ hotelID });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    // Log the entire hotel object to inspect its structure
    console.log("Hotel found:", JSON.stringify(hotel, null, 2));

    // Check if roomCategories exists and contains entries
    if (!hotel.roomCategories || hotel.roomCategories.length === 0) {
      return res
        .status(404)
        .json({ error: "No room categories found in this hotel" });
    }

    // Find the specific room category by the name field (string comparison)
    const roomCategory = hotel.roomCategories.find(
      (category) => category.name === categoryName
    );

    console.log("Room category found:", roomCategory);
    if (!roomCategory) {
      return res.status(404).json({ error: "Room category not found" });
    }

    // Find the specific room by roomName
    const roomNumber = roomCategory.roomNumbers.find(
      (room) => room.name === roomName
    );

    console.log("Room found:", roomNumber);
    if (!roomNumber) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Add booking to the room's bookings array
    roomNumber.bookings.push(booking.bookings[0]); // Pushing the first element of bookings array

    // Update the bookedDates array
    roomNumber.bookedDates.push(...booking.bookedDates); // Spread operator to push all dates from bookedDates

    // Save the updated hotel document
    await hotel.save();

    res.status(200).json({ message: "Booking updated successfully", hotel });
  } catch (error) {
    console.log("Error occurred:", error);
    res.status(500).json({ error: error.message });
  }
};

const deleteBookingDetails = async (req, res) => {
  const { hotelID, categoryName, roomName, datesToDelete } = req.body;

  try {
    console.log("Dates to delete received from client:", datesToDelete);

    // Find the hotel by hotelID
    const hotel = await Hotel.findOne({ hotelID });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    // Find the specific room category
    const roomCategory = hotel.roomCategories.find(
      (category) => category.name === categoryName
    );

    if (!roomCategory) {
      return res.status(404).json({ error: "Room category not found" });
    }

    // Find the specific room by roomName
    const roomNumber = roomCategory.roomNumbers.find(
      (room) => room.name === roomName
    );

    if (!roomNumber) {
      return res.status(404).json({ error: "Room not found" });
    }

    console.log(
      "Current booked dates before deletion:",
      roomNumber.bookedDates
    );

    // Filter out bookings with check-in dates in `datesToDelete`
    roomNumber.bookings = roomNumber.bookings.filter((booking) => {
      const checkInDate =
        booking.checkIn instanceof Date
          ? booking.checkIn.toISOString().split("T")[0]
          : String(booking.checkIn).split("T")[0];
      return !datesToDelete.includes(checkInDate);
    });

    // Filter out dates in `bookedDates` that are in `datesToDelete`
    roomNumber.bookedDates = roomNumber.bookedDates.filter(
      (date) => !datesToDelete.includes(date)
    );

    console.log("Updated booked dates after deletion:", roomNumber.bookedDates);

    // Save the updated hotel document
    await hotel.save();

    res.status(200).json({
      message: "Selected bookings and booked dates deleted successfully",
      removedDates: datesToDelete,
      hotel,
    });
  } catch (error) {
    console.log("Error occurred:", error);
    res.status(500).json({ error: error.message });
  }
};

// @desc Update room status in each category for a hotel
// @route PUT /api/hotels/:hotelID/roomCategories/:categoryID/roomStatus
const updateRoomStatus = async (req, res) => {
  const { hotelID, categoryID } = req.params;
  const { roomStatuses } = req.body; // Expecting roomStatuses as an array of objects [{ id: roomID, status: newStatus }]

  try {
    // Find the hotel by hotelID
    const hotel = await Hotel.findOne({ hotelID });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    // Find the specific room category by categoryID
    const roomCategory = hotel.roomCategories.find(
      (category) => category.name === categoryID
    );
    if (!roomCategory) {
      return res.status(404).json({ error: "Room category not found" });
    }

    // Update the status of each room number in the category
    roomStatuses.forEach(({ name, status }) => {
      const roomNumber = roomCategory.roomNumbers.find(
        (room) => room.name === name
      );
      if (roomNumber) {
        roomNumber.status = status; // Update the status of the specific room
      }
    });

    // Save the updated hotel document
    await hotel.save();

    res
      .status(200)
      .json({ message: "Room statuses updated successfully", hotel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Delete a category
// @route DELETE /api/categories/:id
const deleteHotel = async (req, res) => {
  const { id } = req.params;

  try {
    const hotel = await Hotel.findByIdAndDelete(id);
    if (!hotel) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createHotel,
  getHotel,
  updateHotel,
  updateBooking, // Export the updateBooking method
  deleteHotel,
  deleteBookingDetails,
};
