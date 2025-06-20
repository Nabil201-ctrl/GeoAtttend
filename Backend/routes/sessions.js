import express from 'express';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { calculateDistance } from '../utils/geolocation.js';
import path from 'path';
import fs from 'fs/promises'; // Use promises for async file operations
import { createObjectCsvWriter } from 'csv-writer';
import rateLimit from 'express-rate-limit';
import validator from 'validator'; // For input sanitization
import mongoose from 'mongoose';

const router = express.Router();

// Rate limiter for download endpoint
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 downloads per IP
});

// Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST: Create a new session
router.post('/', auth(['lecturer']), async (req, res) => {
  try {
    const {
      courseId,
      courseName,
      department,
      location,
      radius,
      passcode,
      startTime,
      endTime,
    } = req.body;

    // Input validation
    if (!courseId || !courseName || !department || !location || !passcode || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!validator.isFloat(String(location.latitude), { min: -90, max: 90 }) ||
        !validator.isFloat(String(location.longitude), { min: -180, max: 180 })) {
      return res.status(400).json({ message: 'Invalid location coordinates' });
    }
    if (!validator.isFloat(String(radius), { min: 0 })) {
      return res.status(400).json({ message: 'Invalid radius' });
    }
    if (!validator.isAlphanumeric(passcode, 'en-US', { ignore: '-_' })) {
      return res.status(400).json({ message: 'Invalid passcode format' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: 'Invalid startTime or endTime' });
    }

    const session = new Session({
      courseId: validator.escape(courseId),
      courseName: validator.escape(courseName),
      department: validator.escape(department),
      lecturerId: req.user.id,
      location: {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
      },
      radius: parseFloat(radius),
      passcode: validator.escape(passcode),
      startTime: start,
      endTime: end,
      attendees: [],
    });

    await session.save();
    console.log(`Session created: ${session._id} for course ${courseId}`);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET: Fetch active sessions
router.get('/active', auth(['lecturer']), async (req, res) => {
  try {
    const sessions = await Session.find({
      lecturerId: req.user.id,
      endTime: { $gt: new Date() },
    })
      .select('courseId courseName department startTime endTime passcode attendees')
      .lean(); // Optimize query

    console.log(`Fetched ${sessions.length} active sessions for lecturer ${req.user.id}`);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH: Close a session and generate CSV
router.patch('/:id/close', auth(['lecturer']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }

    const session = await Session.findOne({ _id: id, lecturerId: req.user.id })
      .populate('attendees.userId', 'name department matricNumber')
      .lean();
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Update endTime
    await Session.updateOne({ _id: id }, { endTime: new Date() });

    // Generate CSV for attendees
    const attendees = session.attendees.map(attendee => ({
      name: attendee.userId?.name || 'Unknown',
      department: attendee.userId?.department || 'N/A',
      matricNumber: attendee.userId?.matricNumber || 'N/A',
    }));

    if (attendees.length === 0) {
      console.log(`Session ${id} closed with no attendees`);
      return res.json({ message: 'Session closed, no attendees to export' });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join('uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Define CSV file path
    const csvFilePath = path.join(uploadsDir, `session_${id}_attendees.csv`);

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: csvFilePath,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'department', title: 'Department' },
        { id: 'matricNumber', title: 'Matric Number' },
      ],
    });

    // Write CSV file
    await csvWriter.writeRecords(attendees);
    console.log(`CSV generated for session ${id} at ${csvFilePath}`);

    res.json({
      message: 'Session closed and CSV generated',
      csvUrl: `/api/sessions/download/${id}`,
    });
  } catch (error) {
    console.error('Error closing session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET: Download CSV
router.get('/download/:sessionId', auth(['lecturer']), downloadLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }

    const session = await Session.findOne({ _id: sessionId, lecturerId: req.user.id }).lean();
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const csvFilePath = path.join('uploads', `session_${sessionId}_attendees.csv`);
    try {
      await fs.access(csvFilePath); // Check if file exists
    } catch {
      return res.status(404).json({ message: 'CSV file not found' });
    }

    res.download(csvFilePath, `session_${session.courseId}_attendees.csv`, (err) => {
      if (err) {
        console.error('Error downloading CSV:', err);
        return res.status(500).json({ message: 'Error downloading CSV' });
      }
      console.log(`CSV downloaded for session ${sessionId}`);
      // Do not delete file to allow multiple downloads
      // fs.unlink(csvFilePath, (unlinkErr) => {
      //   if (unlinkErr) console.error('Error deleting CSV:', unlinkErr);
      // });
    });
  } catch (error) {
    console.error('Error serving CSV:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET: Preview attendees (new endpoint)
router.get('/:sessionId/attendees', auth(['lecturer']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }

    const session = await Session.findOne({ _id: sessionId, lecturerId: req.user.id })
      .populate('attendees.userId', 'name department matricNumber')
      .lean();
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const attendees = session.attendees.map(attendee => ({
      name: attendee.userId?.name || 'Unknown',
      department: attendee.userId?.department || 'N/A',
      matricNumber: attendee.userId?.matricNumber || 'N/A',
    }));

    console.log(`Fetched attendees for session ${sessionId}: ${attendees.length} records`);
    res.json({ attendees });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST: Mark attendance
router.post('/attend', auth(['student']), async (req, res) => {
  try {
    const { passcode, location, student, deviceId } = req.body;
    console.log('Attendance request received:', { passcode, studentId: student?.id, deviceId });

    // Input validation
    if (!passcode || !location || !location.latitude || !location.longitude || !student || !student.id || !deviceId) {
      console.log('Missing fields:', { passcode, location, student, deviceId });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!isValidObjectId(student.id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }
    if (!validator.isFloat(String(location.latitude), { min: -90, max: 90 }) ||
        !validator.isFloat(String(location.longitude), { min: -180, max: 180 })) {
      return res.status(400).json({ message: 'Invalid location coordinates' });
    }

    const user = await User.findById(student.id).lean();
    if (!user) {
      console.log(`User not found: ${student.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate device ID (optional if not set)
    if (user.deviceId && user.deviceId !== deviceId) {
      console.log(`Device ID mismatch for user ${student.id}: expected ${user.deviceId}, got ${deviceId}`);
      return res.status(403).json({ message: 'Device ID mismatch. Cannot mark attendance from this device.' });
    }

    const session = await Session.findOne({
      passcode: validator.escape(passcode),
      endTime: { $gt: new Date() },
    });
    if (!session) {
      console.log(`Session not found or expired: ${passcode}`);
      return res.status(404).json({ message: 'Session not found or expired' });
    }

    const course = await Course.findOne({ courseId: session.courseId });
    if (!course) {
      console.log(`Course not found: ${session.courseId}`);
      return res.status(404).json({ message: 'Course not found' });
    }

    // Auto-enroll student if not enrolled
    if (!course.students.includes(student.id)) {
      console.log(`Enrolling student ${student.id} in course ${course.courseId}`);
      course.students.push(student.id);
      await course.save();
    }

    const distance = calculateDistance(
      parseFloat(location.latitude),
      parseFloat(location.longitude),
      session.location.latitude,
      session.location.longitude
    );
    if (distance > session.radius) {
      console.log(`Outside geofence: ${distance.toFixed(2)}m away`);
      return res.status(400).json({ message: `Outside geofence (${distance.toFixed(2)}m away)` });
    }

    const alreadyAttended = session.attendees.some(attendee => attendee.userId.toString() === student.id);
    if (alreadyAttended) {
      console.log(`Attendance already marked for user ${student.id} in session ${session._id}`);
      return res.status(400).json({ message: 'Attendance already marked' });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await Session.updateOne(
      { _id: session._id },
      {
        $push: {
          attendees: {
            userId: student.id,
            ipAddress,
            deviceId,
            timestamp: new Date(),
          },
        },
      }
    );

    console.log(`Attendance marked successfully for user ${student.id} in session ${session._id}`);
    res.json({ message: 'Attendance marked successfully', enrolled: !course.students.includes(student.id) });
  } catch (error) {
    console.error('Attendance error:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE: Cleanup expired sessions (optional endpoint)
router.delete('/cleanup', auth(['lecturer']), async (req, res) => {
  try {
    const result = await Session.deleteMany({
      endTime: { $lt: new Date() },
      lecturerId: req.user.id,
    });
    console.log(`Deleted ${result.deletedCount} expired sessions for lecturer ${req.user.id}`);
    res.json({ message: `${result.deletedCount} expired sessions deleted` });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;