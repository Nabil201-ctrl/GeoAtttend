const mongoose = require('mongoose');

// User schema: This schema is used to store user data for both students and lecturers.
const userSchema = new mongoose.Schema({
  // The username should be unique for each user
  username: { type: String, required: true, unique: true },

  // Email is required and should be unique to each user
  email: { type: String, required: true, unique: true },

  // Password should be hashed before saving to the database for security
  password: { type: String, required: true },

  // Role to distinguish between student and lecturer
  role: { type: String, enum: ['lecturer', 'student'], required: true },

  // Full name of the user
  fullName: { type: String, required: true },

  // Profile picture URL (optional)
  profilePic: { type: String, default: '' },

  // Creation date for the user (auto-generated)
  createdAt: { type: Date, default: Date.now },
});

// Create a model for User and export it
const User = mongoose.model('User', userSchema);
module.exports = User;
