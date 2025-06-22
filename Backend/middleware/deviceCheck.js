// middleware/deviceCheck.js
import User from '../models/User.js';

export const deviceCheck = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'] || req.body.deviceId;
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.deviceId !== deviceId) {
      return res.status(403).json({ 
        message: 'Access denied - device mismatch' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};