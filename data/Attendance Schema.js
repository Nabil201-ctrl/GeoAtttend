import mongoose from "mongoose";

// Attendance schema: Tracks attendance data for students based on geofences.
const attendanceSchema = new mongoose.Schema({
  // Reference to the student who is being marked for attendance
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Reference to the class that the student is attending
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },

  // Reference to the geofence associated with this attendance entry
  geofence: { type: mongoose.Schema.Types.ObjectId, ref: 'Geofence', required: true },

  // Attendance status (whether the student was present or absent)
  status: { type: String, enum: ['present', 'absent'], required: true },

  // Date and time when attendance was marked
  date: { type: Date, default: Date.now },

  // The time when the student marked their attendance
  markedAt: { type: Date, required: true },

  // Automatically set the creation date for the attendance record
  createdAt: { type: Date, default: Date.now },
});

// Create a model for Attendance and export it
const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
