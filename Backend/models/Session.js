// models/Session.js
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  courseId: { type: String, required: true },
  courseName: { type: String, required: true },
  department: { type: String, required: true },
  lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  radius: { type: Number, required: true },
  passcode: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  attendees: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    deviceId: { type: String },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['valid', 'flagged'], default: 'valid' },
    reason: { type: String },
  }],
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);