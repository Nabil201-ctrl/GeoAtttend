// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'lecturer'], required: true },
  matricNumber: {
    type: String,
    required: function () { return this.role === 'student'; },
    unique: function () { return this.role === 'student'; },
    match: [/^\d{2}\/[A-Z0-9]+\/\d{3,}$/, 'Invalid matric number format (e.g., 23/208CSC/586)']
  },
  department: {
    type: String,
    required: function () { return this.role === 'student'; }
  },
  deviceId: { type: String, required: true } // New field for device ID
}, { timestamps: true });

export default mongoose.model('User', userSchema);