// routes/users.js
import express from 'express';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { auth } from '../middleware/auth.js';
import validator from 'validator';

const router = express.Router();

// Get all users (paginated)
router.get('/', auth(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const users = await User.find()
      .select('-password')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await User.countDocuments();
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get device fingerprints
router.get('/devices', auth(['admin']), async (req, res) => {
  try {
    const users = await User.find()
      .select('name deviceId updatedAt')
      .lean(); // Execute the query to get an array of plain objects
    const devices = users.map(user => ({
      _id: user._id,
      userId: { name: user.name },
      deviceId: user.deviceId,
      lastUsed: user.updatedAt,
    }));
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { name, email, password, role, matricNumber, department, deviceId } = req.body;

    if (!['student', 'lecturer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID required' });
    }
    if (role === 'student' && (!matricNumber || !department)) {
      return res.status(400).json({ message: 'Matric number and department required for students' });
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

    const user = new User({
      name,
      email,
      password, // Assume middleware hashes password
      role,
      deviceId,
      ...(role === 'student' && { matricNumber, department }),
    });
    await user.save();

    res.status(201).json({ message: 'User created', user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/:id', auth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, matricNumber, department, status } = req.body;

    if (role && !['student', 'lecturer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }
    if (role === 'student' && matricNumber && matricNumber !== user.matricNumber) {
      const existingMatric = await User.findOne({ matricNumber });
      if (existingMatric) {
        return res.status(400).json({ message: 'Matric number already exists' });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.matricNumber = role === 'student' ? matricNumber : undefined;
    user.department = role === 'student' ? department : undefined;
    user.status = status || user.status;
    await user.save();

    res.json({ message: 'User updated', user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;