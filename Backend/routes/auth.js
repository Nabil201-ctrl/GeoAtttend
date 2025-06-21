// routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, matricNumber, department, deviceId } = req.body;

    if (!['student', 'lecturer', 'admin', 'staff', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    if (role === 'student' && (!matricNumber || !department)) {
      return res.status(400).json({ message: 'Matric number and department are required for students' });
    }
    if (role === 'student' && !/^\d{2}\/[A-Z0-9]+\/\d{3,}$/.test(matricNumber)) {
      return res.status(400).json({ message: 'Invalid matric number format (e.g., 23/208CSC/586)' });
    }
    if (role === 'lecturer' && (matricNumber || department)) {
      return res.status(400).json({ message: 'Matric number and department are not applicable for lecturers' });
    }

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

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      deviceId, // Store device ID
      ...(role === 'student' && { matricNumber, department })
    });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        deviceId: user.deviceId,
        ...(role === 'student' && { matricNumber: user.matricNumber, department: user.department })
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

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

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        deviceId: user.deviceId,
        ...(user.role === 'student' && { matricNumber: user.matricNumber, department: user.department })
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;