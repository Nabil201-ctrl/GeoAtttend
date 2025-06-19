// middleware/checkIp.js
import Session from '../models/Session.js';

export const checkIpConsistency = async (req, res, next) => {
  try {
    const { student } = req.body;
    const { passcode } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const session = await Session.findOne({ passcode });
    if (session) {
      const attendee = session.attendees.find(a => a.userId.toString() === student.id);
      if (attendee && attendee.ipAddress !== ipAddress) {
        return res.status(403).json({ message: 'IP address mismatch. Cannot mark attendance from a different IP.' });
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};