// backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import User from '../models/User.js';

const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, matricNumber, department, deviceId } = req.body;

    // Validate inputs
    if (!name || !email || !password || !deviceId) {
      return res.status(400).json({ message: 'Name, email, password, and device ID are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!['student', 'lecturer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Only student, teacher, or admin roles are allowed for registration' });
    }
    if (role === 'student' && (!matricNumber || !department)) {
      return res.status(400).json({ message: 'Matric number and department are required for students' });
    }
    if (role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount >= 2) {
        return res.status(400).json({ message: 'Maximum number of admins (2) reached' });
      }
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    if (role === 'student') {
      const existingMatric = await User.findOne({ matricNumber });
      if (existingMatric) {
        return res.status(400).json({ message: 'Matric number already exists' });
      }
    }

    // Create user
    const user = new User({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      deviceId,
      ...(role === 'student' && { matricNumber, department }),
    });
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, deviceId: user.deviceId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ token, user: userResponse });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    // Update deviceId if it differs (optional, for legitimate device changes)
    if (user.deviceId !== deviceId) {
      user.deviceId = deviceId;
      await user.save();
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, deviceId: user.deviceId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        deviceId: user.deviceId,
        ...(user.role === 'student' && { matricNumber: user.matricNumber, department: user.department }),
      },
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;